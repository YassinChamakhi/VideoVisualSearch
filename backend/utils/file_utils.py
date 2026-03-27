"""
Utility functions for file handling, path management, and format conversions.
"""
import os
import uuid
import shutil
from pathlib import Path
from typing import Optional
import cv2

import logging
logger = logging.getLogger("utils.file_utils")



# ── Base storage paths ──────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
STORAGE_DIR = BASE_DIR / "storage"
VIDEOS_DIR = STORAGE_DIR / "videos"
FRAMES_DIR = STORAGE_DIR / "frames"
INDICES_DIR = STORAGE_DIR / "indices"


def ensure_dirs():
    """Create all required storage directories if they don't exist."""
    for d in [VIDEOS_DIR, FRAMES_DIR, INDICES_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def generate_video_id() -> str:
    """Generate a unique video ID."""
    return str(uuid.uuid4())


def get_video_path(video_id: str) -> Path:
    """Return the expected path for a video file."""
    # Check common extensions
    for ext in [".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv"]:
        p = VIDEOS_DIR / f"{video_id}{ext}"
        if p.exists():
            return p
    return VIDEOS_DIR / f"{video_id}.mp4"  # default


def get_frames_dir(video_id: str) -> Path:
    """Return the directory where frames for a video are stored."""
    d = FRAMES_DIR / video_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_frame_path(video_id: str, frame_index: int) -> Path:
    """Return the path for a specific frame thumbnail."""
    return get_frames_dir(video_id) / f"frame_{frame_index:06d}.jpg"


def get_index_path(video_id: str) -> Path:
    """Return the FAISS index file path for a video."""
    return INDICES_DIR / f"{video_id}.faiss"


def get_metadata_path(video_id: str) -> Path:
    """Return the metadata JSON path for a video's embeddings/timestamps."""
    return INDICES_DIR / f"{video_id}_meta.json"


def get_video_info_path(video_id: str) -> Path:
    """Return the video info JSON path."""
    return INDICES_DIR / f"{video_id}_info.json"


def format_timestamp(seconds: float) -> str:
    """
    Convert seconds to human-readable time label.
    E.g., 94.5 → '0:01:34'
    """
    seconds = int(seconds)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def get_video_duration(video_path: Path) -> Optional[float]:
    """Get video duration in seconds using OpenCV."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return None
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    cap.release()
    if fps > 0:
        return frame_count / fps
    return None


def cleanup_video_data(video_id: str):
    """Remove all stored data for a given video (video file, frames, index)."""
    video_path = get_video_path(video_id)
    if video_path.exists():
        video_path.unlink()

    frames_dir = FRAMES_DIR / video_id
    if frames_dir.exists():
        shutil.rmtree(frames_dir)

    for suffix in [".faiss", "_meta.json", "_info.json"]:
        p = INDICES_DIR / f"{video_id}{suffix}"
        if p.exists():
            p.unlink()


def save_uploaded_file(upload_file_bytes: bytes, original_filename: str) -> tuple[str, Path]:
    """
    Save raw bytes as an uploaded video file.
    Returns (video_id, saved_path).
    """
    ensure_dirs()
    ext = Path(original_filename).suffix.lower() or ".mp4"
    video_id = generate_video_id()
    dest = VIDEOS_DIR / f"{video_id}{ext}"
    dest.write_bytes(upload_file_bytes)
    return video_id, dest
