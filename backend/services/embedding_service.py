"""
Embedding service using CLIP (via HuggingFace Transformers).

Handles:
- Model loading (lazy, singleton)
- Image → embedding
- Batch image → embeddings
"""
import os
import logging
import numpy as np
from pathlib import Path
from typing import List, Union
from PIL import Image

import torch
from transformers import CLIPProcessor, CLIPModel

# Suppress HuggingFace deprecation warnings
os.environ.setdefault("HF_HOME", os.path.expanduser("~/.cache/huggingface"))

logger = logging.getLogger(__name__)

# ── Model config ─────────────────────────────────────────────────────────────
MODEL_NAME = "openai/clip-vit-base-patch32"
EMBEDDING_DIM = 512  # CLIP ViT-B/32 output dimension

# Singleton references
_model: CLIPModel = None
_processor: CLIPProcessor = None
_device: str = None


def get_device() -> str:
    """Determine best available device."""
    if torch.cuda.is_available():
        return "cuda"
    # Apple Silicon MPS (optional)
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_model():
    """
    Load CLIP model and processor (lazy singleton).
    Called once; subsequent calls are no-ops.
    """
    global _model, _processor, _device

    if _model is not None:
        return  # Already loaded

    logger.info(f"Loading CLIP model: {MODEL_NAME}")
    _device = get_device()
    logger.info(f"Using device: {_device}")

    _processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    _model = CLIPModel.from_pretrained(MODEL_NAME).to(_device)
    _model.eval()  # Inference mode
    logger.info("CLIP model loaded successfully")


def compute_image_embedding(image: Union[Image.Image, Path, str]) -> np.ndarray:
    """
    Compute a normalized CLIP embedding for a single image.

    Args:
        image: PIL Image, or path to image file.

    Returns:
        numpy array of shape (EMBEDDING_DIM,), L2-normalized.
    """
    load_model()

    if not isinstance(image, Image.Image):
        image = Image.open(str(image)).convert("RGB")
    else:
        image = image.convert("RGB")

    inputs = _processor(images=image, return_tensors="pt").to(_device)

    with torch.no_grad():
        features = _model.get_image_features(**inputs)

    # L2-normalize so cosine similarity == dot product
    features = features / features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy().astype(np.float32).squeeze()


def compute_batch_embeddings(
    images: List[Union[Image.Image, Path, str]],
    batch_size: int = 32,
) -> np.ndarray:
    """
    Compute CLIP embeddings for a list of images in batches.

    Args:
        images: List of PIL Images or paths.
        batch_size: Number of images per batch (tune to VRAM).

    Returns:
        numpy array of shape (N, EMBEDDING_DIM), each row L2-normalized.
    """
    load_model()

    all_embeddings = []

    for i in range(0, len(images), batch_size):
        batch = images[i : i + batch_size]

        # Open files if paths were provided
        pil_images = []
        for img in batch:
            if isinstance(img, Image.Image):
                pil_images.append(img.convert("RGB"))
            else:
                pil_images.append(Image.open(str(img)).convert("RGB"))

        inputs = _processor(images=pil_images, return_tensors="pt", padding=True).to(_device)

        with torch.no_grad():
            features = _model.get_image_features(**inputs)

        features = features / features.norm(dim=-1, keepdim=True)
        all_embeddings.append(features.cpu().numpy().astype(np.float32))

    return np.vstack(all_embeddings)


def get_embedding_dim() -> int:
    """Return the embedding dimension for the current model."""
    return EMBEDDING_DIM
