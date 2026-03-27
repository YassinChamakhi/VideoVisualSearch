# ── Backend Dockerfile ────────────────────────────────────────────────────────
FROM python:3.11-slim

# System deps: OpenCV needs libgl, yt-dlp needs ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Increase pip timeout globally to survive slow connections
ENV PIP_DEFAULT_TIMEOUT=300

# ── Step 1: Install PyTorch CPU separately from PyTorch's own fast CDN ────────
# This avoids downloading the huge CUDA version (~2GB) and uses a reliable mirror
RUN pip install --no-cache-dir \
    torch==2.3.0 \
    torchvision==0.18.0 \
    --index-url https://download.pytorch.org/whl/cpu

# ── Step 2: Install the rest of the requirements ──────────────────────────────
COPY requirements.txt .

# Remove torch/torchvision from requirements before installing
# (already installed above) to avoid version conflicts
RUN grep -v "^torch" requirements.txt > requirements_no_torch.txt && \
    pip install --no-cache-dir -r requirements_no_torch.txt

# ── Step 3: Copy application code ─────────────────────────────────────────────
# NOTE: CLIP model (~330MB) downloads automatically on first container startup
# and is cached in the vvs-hf-cache Docker volume — never re-downloaded after
COPY . .

# Create storage directories
RUN mkdir -p storage/videos storage/frames storage/indices

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
