"""
Video service: handles video downloading (yt-dlp) and frame extraction (OpenCV).

Responsibilities:
- Download videos from YouTube URLs
- Extract frames at configurable FPS
- Save thumbnails as JPEG files
- Report progress via callback
"""
import asyncio
import logging
import json
import subprocess
from pathlib import Path
from typing import Callable, Optional, List, Tuple
import cv2
import numpy as np

from utils.file_utils import (
    VIDEOS_DIR,
    get_frames_dir,
    get_frame_path,
    get_video_info_path,
    generate_video_id,
    ensure_dirs,
)
from models.schemas import VideoSource, VideoStatus

logger = logging.getLogger(__name__)

# Max allowed video file size (500 MB)
MAX_VIDEO_SIZE_MB = 500
MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024


async def download_youtube_video(
    url: str,
    progress_callback: Optional[Callable] = None,
) -> Tuple[str, Path]:
    """
    Download a YouTube video using yt-dlp.

    Args:
        url: YouTube URL.
        progress_callback: async callable(stage, progress, message).

    Returns:
        (video_id, video_path)
    """
    ensure_dirs()
    video_id = generate_video_id()
    output_template = str(VIDEOS_DIR / f"{video_id}.%(ext)s")

    if progress_callback:
        await progress_callback("downloading", 0.05, "Starting YouTube download…")

    # yt-dlp command: best quality mp4, max 500MB, no playlist
    cmd = [
        "yt-dlp",
        "--no-playlist",
        "--format", "bestvideo[ext=mp4][filesize<?500M]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--output", output_template,
        "--no-warnings",
        url,
    ]

    logger.info(f"Running yt-dlp: {' '.join(cmd)}")

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        err = stderr.decode(errors="ignore")
        logger.error(f"yt-dlp failed: {err}")
        raise RuntimeError(f"YouTube download failed: {err[:300]}")

    # Find the downloaded file
    video_path = None
    for ext in [".mp4", ".mkv", ".webm", ".avi"]:
        candidate = VIDEOS_DIR / f"{video_id}{ext}"
        if candidate.exists():
            video_path = candidate
            break

    if video_path is None:
        raise FileNotFoundError("Downloaded video file not found")

    # Check size
    if video_path.stat().st_size > MAX_VIDEO_SIZE_BYTES:
        video_path.unlink()
        raise ValueError(f"Video exceeds maximum size of {MAX_VIDEO_SIZE_MB} MB")

    if progress_callback:
        await progress_callback("downloading", 1.0, "Download complete")

    return video_id, video_path


def extract_frames(
    video_path: Path,
    video_id: str,
    fps: float = 1.0,
    progress_callback: Optional[Callable] = None,
) -> List[Tuple[int, float, Path]]:
    """
    Extract frames from a video at the given FPS rate.

    Args:
        video_path: Path to the video file.
        video_id: Unique video identifier (for storage).
        fps: Frames per second to extract (e.g., 1.0 = one frame every second).
        progress_callback: sync callable(stage, progress, message, frames_done, total).

    Returns:
        List of (frame_index, timestamp_seconds, frame_path) tuples.
    """
    frames_dir = get_frames_dir(video_id)
    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    total_frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frame_count / video_fps if video_fps > 0 else 0

    # How many video frames to skip between captures
    frame_interval = max(1, int(round(video_fps / fps)))

    logger.info(
        f"Video: {duration:.1f}s @ {video_fps:.2f} FPS, "
        f"extracting every {frame_interval} frames (target {fps} FPS)"
    )

    extracted: List[Tuple[int, float, Path]] = []
    frame_number = 0
    extract_index = 0

    # Estimate total frames we'll extract
    estimated_total = max(1, int(duration * fps))

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_number % frame_interval == 0:
            timestamp = frame_number / video_fps
            frame_path = get_frame_path(video_id, extract_index)

            # Resize to thumbnail (320×180) to save disk space
            thumbnail = _resize_frame(frame, max_width=320)
            cv2.imwrite(str(frame_path), thumbnail, [cv2.IMWRITE_JPEG_QUALITY, 85])

            extracted.append((extract_index, timestamp, frame_path))
            extract_index += 1

            # Report progress every 10 frames
            if progress_callback and extract_index % 10 == 0:
                progress = min(0.9, extract_index / estimated_total)
                progress_callback(
                    "extracting",
                    progress,
                    f"Extracted {extract_index} frames…",
                    extract_index,
                    estimated_total,
                )

        frame_number += 1

    cap.release()
    logger.info(f"Extracted {len(extracted)} frames from {video_path.name}")
    return extracted


def _resize_frame(frame: np.ndarray, max_width: int = 320) -> np.ndarray:
    """Resize a frame to max_width while preserving aspect ratio."""
    h, w = frame.shape[:2]
    if w <= max_width:
        return frame
    scale = max_width / w
    new_w = max_width
    new_h = int(h * scale)
    return cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)


def save_video_info(video_id: str, info: dict):
    """Persist video metadata to JSON."""
    path = get_video_info_path(video_id)
    path.write_text(json.dumps(info, indent=2))


def load_video_info(video_id: str) -> Optional[dict]:
    """Load video metadata from JSON. Returns None if not found."""
    path = get_video_info_path(video_id)
    if not path.exists():
        return None
    return json.loads(path.read_text())
