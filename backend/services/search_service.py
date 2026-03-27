"""
Search service: builds and queries FAISS indices for visual similarity search.

Responsibilities:
- Build a FAISS index from frame embeddings
- Save / load index from disk
- Query index with a new embedding
- Store and retrieve timestamp + frame metadata
"""
import json
import logging
import time
from pathlib import Path
from typing import List, Optional, Tuple
import numpy as np
import faiss

from utils.file_utils import get_index_path, get_metadata_path, format_timestamp
from models.schemas import FrameResult

logger = logging.getLogger(__name__)


# ── Index building ────────────────────────────────────────────────────────────

def build_and_save_index(
    video_id: str,
    embeddings: np.ndarray,         # shape (N, D)
    timestamps: List[float],         # length N
    frame_paths: List[str],          # length N – relative URL-safe paths
    frame_indices: List[int],        # length N
) -> int:
    """
    Build a FAISS flat L2 index from embeddings and save to disk.

    We use IndexFlatIP (inner product on L2-normalized vectors = cosine similarity).

    Returns:
        Number of vectors indexed.
    """
    assert len(embeddings) == len(timestamps) == len(frame_paths), \
        "Mismatch between embeddings, timestamps, and frame paths"

    n, dim = embeddings.shape
    logger.info(f"Building FAISS index: {n} vectors of dim {dim}")

    # Inner-product index (works as cosine similarity when vectors are L2-normalized)
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    # Save FAISS index
    index_path = get_index_path(video_id)
    faiss.write_index(index, str(index_path))

    # Save metadata (timestamps + frame paths)
    meta = {
        "video_id": video_id,
        "total_frames": n,
        "embedding_dim": dim,
        "frames": [
            {
                "idx": frame_indices[i],
                "timestamp": timestamps[i],
                "thumbnail": frame_paths[i],
                "time_label": format_timestamp(timestamps[i]),
            }
            for i in range(n)
        ],
    }
    metadata_path = get_metadata_path(video_id)
    metadata_path.write_text(json.dumps(meta, indent=2))

    logger.info(f"FAISS index saved: {index_path}")
    return n


def load_index(video_id: str) -> Tuple[Optional[faiss.Index], Optional[dict]]:
    """
    Load FAISS index and metadata for a video.

    Returns:
        (index, metadata_dict) or (None, None) if not found.
    """
    index_path = get_index_path(video_id)
    metadata_path = get_metadata_path(video_id)

    if not index_path.exists() or not metadata_path.exists():
        return None, None

    index = faiss.read_index(str(index_path))
    meta = json.loads(metadata_path.read_text())
    return index, meta


def search_similar_frames(
    video_id: str,
    query_embedding: np.ndarray,   # shape (D,) or (1, D)
    top_k: int = 10,
    thumbnail_base_url: str = "",
) -> List[FrameResult]:
    """
    Search for the top-k most similar frames to the query embedding.

    Args:
        video_id: Video to search.
        query_embedding: L2-normalized embedding of the query image.
        top_k: Number of results.
        thumbnail_base_url: URL prefix for thumbnail images.

    Returns:
        List of FrameResult objects sorted by descending similarity.
    """
    index, meta = load_index(video_id)
    if index is None:
        raise FileNotFoundError(f"No index found for video_id={video_id}. Process the video first.")

    # Ensure correct shape
    query = query_embedding.reshape(1, -1).astype(np.float32)

    # Normalize query (just in case it isn't)
    norm = np.linalg.norm(query)
    if norm > 0:
        query = query / norm

    t0 = time.time()
    k = min(top_k, index.ntotal)
    scores, indices = index.search(query, k)
    elapsed_ms = (time.time() - t0) * 1000

    results = []
    frames_meta = meta["frames"]

    for rank in range(k):
        idx = int(indices[0][rank])
        score = float(scores[0][rank])

        if idx < 0 or idx >= len(frames_meta):
            continue

        frame = frames_meta[idx]
        thumbnail_url = f"{thumbnail_base_url}/{frame['thumbnail']}"

        results.append(
            FrameResult(
                timestamp=frame["timestamp"],
                score=round(score, 4),
                frame_index=frame["idx"],
                thumbnail_url=thumbnail_url,
                time_label=frame["time_label"],
            )
        )

    # Sort by descending score
    results.sort(key=lambda r: r.score, reverse=True)
    logger.info(f"Search completed in {elapsed_ms:.1f}ms, found {len(results)} results")
    return results


def index_exists(video_id: str) -> bool:
    """Check whether a FAISS index has been built for this video."""
    return get_index_path(video_id).exists() and get_metadata_path(video_id).exists()
