"""
Tests for FAISS search logic.
"""
import numpy as np
import pytest

try:
    import faiss
    HAS_FAISS = True
except ImportError:
    HAS_FAISS = False


@pytest.mark.skipif(not HAS_FAISS, reason="faiss not installed")
class TestFaissIndex:
    def _build_index(self, vecs):
        index = faiss.IndexFlatIP(vecs.shape[1])
        index.add(vecs)
        return index

    def test_index_size(self, dummy_embeddings):
        index = self._build_index(dummy_embeddings)
        assert index.ntotal == len(dummy_embeddings)

    def test_top1_is_self(self, dummy_embeddings):
        index = self._build_index(dummy_embeddings)
        query = dummy_embeddings[0:1]
        _, I = index.search(query, 1)
        assert I[0][0] == 0

    def test_top_k_returns_k_results(self, dummy_embeddings):
        index = self._build_index(dummy_embeddings)
        query = dummy_embeddings[0:1]
        k = 5
        D, I = index.search(query, k)
        assert len(I[0]) == k

    def test_scores_are_descending(self, dummy_embeddings):
        index = self._build_index(dummy_embeddings)
        query = dummy_embeddings[0:1]
        D, _ = index.search(query, len(dummy_embeddings))
        assert list(D[0]) == sorted(D[0], reverse=True)

    def test_empty_index_returns_zero(self):
        index = faiss.IndexFlatIP(512)
        assert index.ntotal == 0
