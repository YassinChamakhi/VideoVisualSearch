"""
Video Visual Search — FastAPI Backend
Entry point: uvicorn main:app --reload
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import router
from services.embedding_service import load_model
from utils.file_utils import ensure_dirs, STORAGE_DIR

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: ensure directories exist and warm up the CLIP model."""
    logger.info("=== Video Visual Search — Starting up ===")
    ensure_dirs()
    logger.info("Storage directories verified")

    # Warm up CLIP (downloads model on first run, ~330 MB)
    load_model()
    logger.info("CLIP model ready")

    yield  # Application runs here

    logger.info("=== Shutting down ===")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Video Visual Search",
    description="Find visually similar moments in a video using CLIP + FAISS.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ────────────────────────────────────────────────────────────────
app.include_router(router, prefix="/api")

# ── Static files (thumbnails served from /frames/...) ────────────────────────
app.mount("/frames", StaticFiles(directory=str(STORAGE_DIR / "frames")), name="frames")

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "Video Visual Search"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
