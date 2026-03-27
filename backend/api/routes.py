"""
FastAPI route definitions.

Endpoints:
  POST /upload-video       – Upload a local video file
  POST /download-youtube   – Download video from YouTube URL
  POST /process-video      – Start frame extraction + embedding pipeline
  GET  /video-status/{id}  – Check processing progress
  POST /search-by-image    – Run similarity search with a query image
  GET  /results/{id}       – Retrieve latest search results for a video
  GET  /video/{id}         – Stream the video file
  GET  /frames/{...}       – Serve frame thumbnail images
"""
import asyncio
import logging
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, BackgroundTasks, Request
from fastapi.responses import FileResponse, StreamingResponse

from models.schemas import (
    UploadVideoResponse,
    ProcessVideoRequest,
    ProcessVideoResponse,
    SearchResponse,
    VideoSource,
    VideoStatus,
    ProgressUpdate,
    FrameResult,
)
from services.video_service import (
    download_youtube_video,
    save_video_info,
    load_video_info,
)
from services.pipeline_service import run_processing_pipeline, get_progress, set_progress
from services.search_service import search_similar_frames, index_exists
from services.embedding_service import compute_image_embedding
from utils.file_utils import (
    save_uploaded_file,
    get_video_path,
    get_video_duration,
    ensure_dirs,
    FRAMES_DIR,
    VIDEOS_DIR,
)
from PIL import Image
import io

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory store for last search results per video_id
_search_results_store: dict = {}


# ── 1. Upload video ──────────────────────────────────────────────────────────

@router.post("/upload-video", response_model=UploadVideoResponse, tags=["Video"])
async def upload_video(file: UploadFile = File(...)):
    """
    Upload a local video file.
    Supported formats: mp4, avi, mov, mkv, webm.
    Max size: 500 MB.
    """
    ensure_dirs()

    ALLOWED_TYPES = {"video/mp4", "video/avi", "video/quicktime",
                     "video/x-matroska", "video/webm", "video/x-msvideo"}
    ALLOWED_EXTS  = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv"}

    ext = Path(file.filename or "video.mp4").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, f"Unsupported file extension: {ext}")

    content = await file.read()

    if len(content) > 500 * 1024 * 1024:
        raise HTTPException(413, "Video exceeds 500 MB limit")

    video_id, saved_path = save_uploaded_file(content, file.filename or "video.mp4")

    duration = get_video_duration(saved_path)

    info = {
        "video_id": video_id,
        "filename": file.filename,
        "source": VideoSource.UPLOAD.value,
        "status": VideoStatus.PENDING.value,
        "duration_seconds": duration,
    }
    save_video_info(video_id, info)
    set_progress(video_id, "pending", 0.0, "Video uploaded, ready to process")

    logger.info(f"Uploaded video: {video_id} ({file.filename}, {len(content)/1024/1024:.1f} MB)")

    return UploadVideoResponse(
        video_id=video_id,
        filename=file.filename or "video",
        source=VideoSource.UPLOAD,
        duration_seconds=duration,
        message="Video uploaded successfully",
    )


# ── 2. Download from YouTube ──────────────────────────────────────────────────

@router.post("/download-youtube", response_model=UploadVideoResponse, tags=["Video"])
async def download_from_youtube(
    url: str = Form(...),
    background_tasks: BackgroundTasks = None,
):
    """
    Download a video from a YouTube URL using yt-dlp.
    """
    ensure_dirs()

    if "youtube.com" not in url and "youtu.be" not in url:
        raise HTTPException(400, "Please provide a valid YouTube URL")

    # Create placeholder info immediately
    from utils.file_utils import generate_video_id
    video_id = generate_video_id()

    set_progress(video_id, "downloading", 0.01, "Initializing download…")
    info = {
        "video_id": video_id,
        "filename": url,
        "source": VideoSource.YOUTUBE.value,
        "status": VideoStatus.PROCESSING.value,
        "url": url,
    }
    save_video_info(video_id, info)

    # Download in background
    async def _do_download():
        try:
            async def progress_cb(stage, progress, message):
                set_progress(video_id, stage, progress * 0.3, message)

            _, video_path = await download_youtube_video(
                url=url,
                progress_callback=progress_cb,
            )
            duration = get_video_duration(video_path)
            info.update({
                "status": VideoStatus.PENDING.value,
                "duration_seconds": duration,
                "filename": video_path.name,
            })
            save_video_info(video_id, info)
            set_progress(video_id, "pending", 0.3, "Download complete, ready to process")
            logger.info(f"YouTube download complete: {video_id}")
        except Exception as e:
            logger.error(f"YouTube download failed: {e}")
            info.update({"status": VideoStatus.ERROR.value, "error_message": str(e)})
            save_video_info(video_id, info)
            set_progress(video_id, "error", 0.0, f"Download failed: {str(e)[:200]}")

    asyncio.create_task(_do_download())

    return UploadVideoResponse(
        video_id=video_id,
        filename=url,
        source=VideoSource.YOUTUBE,
        message="YouTube download started in background",
    )


# ── 3. Process video ──────────────────────────────────────────────────────────

@router.post("/process-video", response_model=ProcessVideoResponse, tags=["Processing"])
async def process_video(body: ProcessVideoRequest):
    """
    Extract frames and build FAISS embedding index for a video.
    This can take a while for long videos; poll /video-status/{id} for progress.
    """
    video_id = body.video_id
    fps = body.fps

    video_path = get_video_path(video_id)
    if not video_path.exists():
        raise HTTPException(404, f"Video not found: {video_id}. Upload it first.")

    # Update status to processing
    info = load_video_info(video_id) or {"video_id": video_id}
    info["status"] = VideoStatus.PROCESSING.value
    save_video_info(video_id, info)
    set_progress(video_id, "processing", 0.01, "Pipeline starting…")

    # Run pipeline in background
    async def _run():
        try:
            result = await run_processing_pipeline(video_id, video_path, fps=fps)
            logger.info(f"Processing done: {video_id}")
        except Exception as e:
            logger.error(f"Pipeline failed for {video_id}: {e}")
            info2 = load_video_info(video_id) or {}
            info2["status"] = VideoStatus.ERROR.value
            info2["error_message"] = str(e)
            save_video_info(video_id, info2)
            set_progress(video_id, "error", 0.0, f"Processing failed: {str(e)[:200]}")

    asyncio.create_task(_run())

    return ProcessVideoResponse(
        video_id=video_id,
        total_frames=0,
        fps_used=fps,
        processing_time_seconds=0,
        message="Processing started. Poll /video-status/{id} for progress.",
    )


# ── 4. Video status / progress ───────────────────────────────────────────────

@router.get("/video-status/{video_id}", response_model=ProgressUpdate, tags=["Processing"])
async def video_status(video_id: str):
    """
    Poll this endpoint to get real-time processing progress.
    """
    progress = get_progress(video_id)
    if progress is None:
        raise HTTPException(404, f"No status found for video_id={video_id}")
    return ProgressUpdate(**progress)


# ── 5. Search by image ────────────────────────────────────────────────────────

@router.post("/search-by-image", response_model=SearchResponse, tags=["Search"])
async def search_by_image(
    request: Request,
    video_id: str = Form(...),
    top_k: int = Form(default=10),
    file: UploadFile = File(...),
):
    """
    Upload a query image and find visually similar frames in the video.
    Returns top-k results sorted by similarity score.
    """
    if not index_exists(video_id):
        raise HTTPException(
            404,
            f"No index found for video_id={video_id}. Process the video first."
        )

    # Read and validate image
    img_bytes = await file.read()
    try:
        pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image file. Please upload a JPG, PNG, or WebP.")

    # Compute embedding in thread pool
    loop = asyncio.get_event_loop()
    query_embedding = await loop.run_in_executor(
        None, compute_image_embedding, pil_image
    )

    # Build base URL for thumbnails
    base_url = str(request.base_url).rstrip("/")

    t0 = time.time()
    results = search_similar_frames(
        video_id=video_id,
        query_embedding=query_embedding,
        top_k=top_k,
        thumbnail_base_url=base_url,
    )
    elapsed_ms = (time.time() - t0) * 1000

    # Cache results
    _search_results_store[video_id] = results

    return SearchResponse(
        video_id=video_id,
        results=results,
        query_time_ms=round(elapsed_ms, 1),
    )


# ── 6. Get cached results ─────────────────────────────────────────────────────

@router.get("/results/{video_id}", tags=["Search"])
async def get_results(video_id: str):
    """Return the most recent search results for a video."""
    results = _search_results_store.get(video_id)
    if results is None:
        raise HTTPException(404, "No results found. Run a search first.")
    return {"video_id": video_id, "results": results}


# ── 7. Stream video file ──────────────────────────────────────────────────────

@router.get("/video/{video_id}", tags=["Media"])
async def serve_video(video_id: str, request: Request):
    """
    Stream the video file for playback in the browser.
    Supports HTTP Range requests for seeking.
    """
    video_path = get_video_path(video_id)
    if not video_path.exists():
        raise HTTPException(404, "Video file not found")

    file_size = video_path.stat().st_size
    range_header = request.headers.get("range")

    media_type = "video/mp4"
    ext = video_path.suffix.lower()
    if ext == ".webm":
        media_type = "video/webm"
    elif ext in (".avi", ".x-msvideo"):
        media_type = "video/x-msvideo"

    if range_header:
        # Partial content for seeking
        range_val = range_header.replace("bytes=", "")
        start_str, end_str = range_val.split("-")
        start = int(start_str)
        end = int(end_str) if end_str else file_size - 1
        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        def _iter():
            with open(video_path, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    data = f.read(min(65536, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
        }
        return StreamingResponse(_iter(), status_code=206,
                                 headers=headers, media_type=media_type)

    return FileResponse(str(video_path), media_type=media_type,
                        headers={"Accept-Ranges": "bytes"})


# ── 8. Serve frame thumbnails ─────────────────────────────────────────────────

@router.get("/frames/{video_id}/{filename}", tags=["Media"])
async def serve_frame(video_id: str, filename: str):
    """Serve a frame thumbnail image."""
    frame_path = FRAMES_DIR / video_id / filename
    if not frame_path.exists():
        raise HTTPException(404, "Frame not found")
    return FileResponse(str(frame_path), media_type="image/jpeg")


# ── 9. Video info ─────────────────────────────────────────────────────────────

@router.get("/video-info/{video_id}", tags=["Video"])
async def get_video_info(video_id: str):
    """Get stored metadata for a video."""
    info = load_video_info(video_id)
    if info is None:
        raise HTTPException(404, f"No info found for video_id={video_id}")
    return info
