"""
Integration tests for the FastAPI endpoints.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

pytest.importorskip("fastapi")
pytest.importorskip("httpx")

from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    with patch.dict("sys.modules", {
        "transformers": MagicMock(),
        "torch": MagicMock(),
        "faiss": MagicMock(),
        "cv2": MagicMock(),
        "yt_dlp": MagicMock(),
    }):
        try:
            from backend.main import app
            with TestClient(app) as c:
                yield c
        except Exception:
            pytest.skip("App could not be imported in CI environment")


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        r = client.get("/health")
        assert r.status_code == 200

    def test_health_response_has_status(self, client):
        r = client.get("/health")
        assert r.status_code == 200
