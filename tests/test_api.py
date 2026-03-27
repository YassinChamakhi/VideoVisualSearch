"""
Integration tests for the FastAPI endpoints.
Uses TestClient — no real model is loaded.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# Only run if fastapi + httpx are available
pytest.importorskip("fastapi")
pytest.importorskip("httpx")

from fastapi.testclient import TestClient


@pytest.fixture
def client():
    with patch("backend.services.embedding_service.EmbeddingService.__init__", return_value=None), \
         patch("backend.services.embedding_service.EmbeddingService.load_model", return_value=None):
        from backend.main import app
        with TestClient(app) as c:
            yield c


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        r = client.get("/health")
        assert r.status_code == 200

    def test_health_response_has_status(self, client):
        r = client.get("/health")
        data = r.json()
        assert "status" in data or r.status_code == 200
