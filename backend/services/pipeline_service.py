"""
Pipeline service: orchestrates the full processing pipeline.

Flow:
  1. Extract frames from video
  2. Compute CLIP embeddings (batch)
  3. Build FAISS index
  4. Update progress throughout
"""
import asyncio
import logging
import time
from pathlib import Path
from typing import Callable, Optional

import numpy as np

from services.video_service import extract_frames, save_video_info, load_video_info
from services.embedding_service import compute_batch_embeddings
from services.search_service import build_and_save_index
from utils.file_utils import get_frames_dir, FRAMES_DIR
from models.schemas import VideoStatus

logger = logging.getLogger(__name__)

# In-memory progress store: video_id → progress dict
# In production you'd use Redis or a DB, but a dict is fine for single-node
_progress_store: dict = {}


def get_progress(video_id: str) -> Optional[dict]:
    return _progress_store.get(video_id)


def set_progress(video_id: str, stage: str, progress: float, message: str,
                 frames_processed: int = 0, total_frames: int = 0):
    _progress_store[video_id] = {
        "video_id": video_id,
        "stage": stage,
        "progress": progress,
        "message": message,
        "frames_processed": frames_processed,
        "total_frames": total_frames,
    }


async def run_processing_pipeline(
    video_id: str,
    video_path: Path,
    fps: float = 1.0,
) -> dict:
    """
    Full async pipeline: frame extraction → embedding → FAISS indexing.

    Runs CPU-intensive work in a thread pool to avoid blocking the event loop.

    Returns:
        dict with pipeline results (total_frames, fps_used, processing_time_seconds)
    """
    t_start = time.time()
    logger.info(f"Starting pipeline for video_id={video_id}, fps={fps}")

    set_progress(video_id, "extracting", 0.05, "Starting frame extraction…")

    # ── Step 1: Extract frames (blocking I/O → thread pool) ────────────────
    def _sync_extract():
        def _cb(stage, progress, msg, done=0, total=0):
            # Scale extraction to 0–40% of total progress
            set_progress(video_id, stage, progress * 0.4, msg, done, total)
        return extract_frames(video_path, video_id, fps=fps, progress_callback=_cb)

    loop = asyncio.get_event_loop()
    frame_tuples = await loop.run_in_executor(None, _sync_extract)

    if not frame_tuples:
        raise RuntimeError("No frames were extracted from the video")

    total_frames = len(frame_tuples)
    frame_indices = [t[0] for t in frame_tuples]
    timestamps = [t[1] for t in frame_tuples]
    frame_paths = [t[2] for t in frame_tuples]

    set_progress(video_id, "embedding", 0.45,
                 f"Computing embeddings for {total_frames} frames…",
                 0, total_frames)

    # ── Step 2: Compute CLIP embeddings (GPU/CPU) ───────────────────────────
    def _sync_embed():
        embeddings = compute_batch_embeddings(frame_paths, batch_size=32)
        return embeddings

    embeddings: np.ndarray = await loop.run_in_executor(None, _sync_embed)

    set_progress(video_id, "indexing", 0.85,
                 "Building similarity index…",
                 total_frames, total_frames)

    # ── Step 3: Build FAISS index ───────────────────────────────────────────
    # Convert frame paths to relative URL-safe strings
    relative_paths = [
        f"frames/{video_id}/{p.name}" for p in frame_paths
    ]

    def _sync_index():
        build_and_save_index(
            video_id=video_id,
            embeddings=embeddings,
            timestamps=timestamps,
            frame_paths=relative_paths,
            frame_indices=frame_indices,
        )

    await loop.run_in_executor(None, _sync_index)

    elapsed = time.time() - t_start
    set_progress(video_id, "done", 1.0,
                 f"Ready! Indexed {total_frames} frames in {elapsed:.1f}s",
                 total_frames, total_frames)

    # Update stored video info
    info = load_video_info(video_id) or {}
    info.update({
        "status": VideoStatus.READY.value,
        "total_frames": total_frames,
        "fps_used": fps,
        "processing_time_seconds": round(elapsed, 2),
    })
    save_video_info(video_id, info)

    logger.info(f"Pipeline complete: {total_frames} frames in {elapsed:.2f}s")
    return {
        "total_frames": total_frames,
        "fps_used": fps,
        "processing_time_seconds": round(elapsed, 2),
    }
