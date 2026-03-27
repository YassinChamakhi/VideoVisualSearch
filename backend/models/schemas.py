"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class VideoSource(str, Enum):
    UPLOAD = "upload"
    YOUTUBE = "youtube"


class ProcessVideoRequest(BaseModel):
    video_id: str = Field(..., description="Unique ID of the uploaded/downloaded video")
    fps: float = Field(default=1.0, ge=0.1, le=5.0, description="Frames per second to extract")


class SearchRequest(BaseModel):
    video_id: str = Field(..., description="Video ID to search within")
    top_k: int = Field(default=10, ge=1, le=50, description="Number of top results to return")


class FrameResult(BaseModel):
    timestamp: float = Field(..., description="Timestamp in seconds")
    score: float = Field(..., description="Similarity score (0-1, higher is better)")
    frame_index: int = Field(..., description="Frame index in the video")
    thumbnail_url: str = Field(..., description="URL to the frame thumbnail image")
    time_label: str = Field(..., description="Human-readable time label e.g. '0:02:34'")


class SearchResponse(BaseModel):
    video_id: str
    results: List[FrameResult]
    query_time_ms: float


class UploadVideoResponse(BaseModel):
    video_id: str
    filename: str
    source: VideoSource
    duration_seconds: Optional[float] = None
    message: str


class ProcessVideoResponse(BaseModel):
    video_id: str
    total_frames: int
    fps_used: float
    processing_time_seconds: float
    message: str


class VideoStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class VideoInfo(BaseModel):
    video_id: str
    filename: str
    source: VideoSource
    status: VideoStatus
    duration_seconds: Optional[float] = None
    total_frames: Optional[int] = None
    fps_used: Optional[float] = None
    error_message: Optional[str] = None


class ProgressUpdate(BaseModel):
    video_id: str
    stage: str  # "downloading", "extracting", "embedding", "indexing", "done"
    progress: float  # 0.0 to 1.0
    message: str
    frames_processed: Optional[int] = None
    total_frames: Optional[int] = None
