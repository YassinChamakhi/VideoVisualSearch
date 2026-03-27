"""
Shared pytest fixtures for VideoVisualSearch tests.
"""
import numpy as np
import pytest


@pytest.fixture
def dummy_embedding():
    """A single L2-normalised 512-dim vector (matches CLIP ViT-B/32)."""
    vec = np.random.rand(512).astype("float32")
    vec /= np.linalg.norm(vec)
    return vec


@pytest.fixture
def dummy_embeddings():
    """Batch of 10 L2-normalised 512-dim vectors."""
    vecs = np.random.rand(10, 512).astype("float32")
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    return vecs / norms


@pytest.fixture
def dummy_video_id():
    return "test-video-abc123"
