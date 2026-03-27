"""
Tests for the CLIP embedding service.
"""
import numpy as np
import pytest
from unittest.mock import MagicMock, patch


class TestEmbeddingDimensions:
    def test_embedding_is_512_dim(self, dummy_embedding):
        assert dummy_embedding.shape == (512,)

    def test_embedding_is_normalised(self, dummy_embedding):
        norm = float(np.linalg.norm(dummy_embedding))
        assert abs(norm - 1.0) < 1e-5

    def test_batch_embeddings_shape(self, dummy_embeddings):
        assert dummy_embeddings.shape == (10, 512)

    def test_batch_embeddings_are_normalised(self, dummy_embeddings):
        norms = np.linalg.norm(dummy_embeddings, axis=1)
        assert np.allclose(norms, 1.0, atol=1e-5)


class TestCosineSimilarity:
    def test_identical_vectors_similarity_is_one(self, dummy_embedding):
        sim = float(np.dot(dummy_embedding, dummy_embedding))
        assert abs(sim - 1.0) < 1e-5

    def test_similarity_range(self, dummy_embeddings):
        query = dummy_embeddings[0]
        sims = dummy_embeddings @ query
        assert sims.min() >= -1.0 - 1e-5
        assert sims.max() <=  1.0 + 1e-5

    def test_top_match_is_self(self, dummy_embeddings):
        query = dummy_embeddings[0]
        sims = dummy_embeddings @ query
        assert int(np.argmax(sims)) == 0
