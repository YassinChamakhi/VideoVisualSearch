# 🎬 Video Visual Search

Find visually similar moments in any video using **CLIP embeddings** and **FAISS** vector search.

Upload a video (or paste a YouTube URL), upload a query image, and instantly see every timestamp where similar visual content appears — with one-click seeking.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Video sources** | Local file upload (MP4, MKV, WebM, AVI) or YouTube URL |
| **AI backbone** | OpenAI CLIP (`clip-vit-base-patch32`) via HuggingFace Transformers |
| **Vector search** | Facebook FAISS — sub-millisecond nearest-neighbor search |
| **Frame extraction** | OpenCV — configurable 0.5/1/2 FPS |
| **Results** | Top-K matches with thumbnail previews, similarity scores, timestamps |
| **One-click seek** | Click any result → video player jumps to that moment |
| **Progress tracking** | Real-time progress bar during processing |
| **Max video size** | 500 MB (configurable) |

---

## 🗂 Project Structure

```
video-visual-search/
├── backend/
│   ├── api/
│   │   └── routes.py           # All FastAPI endpoints
│   ├── services/
│   │   ├── embedding_service.py # CLIP model loading + inference
│   │   ├── video_service.py     # yt-dlp download + OpenCV extraction
│   │   ├── search_service.py    # FAISS index build/query
│   │   └── pipeline_service.py  # Orchestrates the full pipeline
│   ├── models/
│   │   └── schemas.py           # Pydantic request/response models
│   ├── utils/
│   │   └── file_utils.py        # Paths, file helpers, timestamp formatting
│   ├── storage/                 # Auto-created at runtime
│   │   ├── videos/              # Uploaded/downloaded video files
│   │   ├── frames/              # Extracted frame thumbnails
│   │   └── indices/             # FAISS indices + metadata JSON
│   ├── main.py                  # FastAPI app entrypoint
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── VideoUploadPanel.jsx   # Local upload + YouTube URL
        │   ├── ImageSearchPanel.jsx   # Query image upload
        │   ├── ProgressBar.jsx        # Processing progress
        │   ├── ResultsGrid.jsx        # Thumbnail grid with seek buttons
        │   └── VideoPlayer.jsx        # Native HTML5 video with seek API
        ├── hooks/
        │   ├── useVideoProcessing.js  # Upload → process → poll state
        │   └── useSearch.js           # Image search state
        ├── services/
        │   └── api.js                 # Axios API client
        ├── App.jsx
        ├── App.module.css
        └── index.css
```

---

## ⚙️ Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | ≥ 3.10 | [python.org](https://python.org) |
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| yt-dlp | latest | `pip install yt-dlp` or see below |
| ffmpeg | any | Required by yt-dlp for merging streams |

### Install ffmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.

---

## 🚀 Quick Start

### 1. Clone / extract the project

```bash
cd video-visual-search
```

### 2. Set up the Python backend

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) copy env template
cp .env.example .env
```

> **First run note:** On first startup, the CLIP model (~330 MB) will be downloaded from HuggingFace and cached in `~/.cache/huggingface/`. Subsequent startups are instant.

### 3. Start the backend

```bash
# From the backend/ directory with venv activated:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO  CLIP model ready
INFO  Uvicorn running on http://0.0.0.0:8000
```

API docs available at: **http://localhost:8000/docs**

### 4. Set up and start the frontend

Open a new terminal:

```bash
cd frontend

# Install Node dependencies
npm install

# Start the dev server
npm start
```

The app opens at **http://localhost:3000**

---

## 🔁 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload-video` | Upload a local video file (multipart) |
| `POST` | `/api/download-youtube` | Download video from YouTube URL |
| `POST` | `/api/process-video` | Start frame extraction + FAISS indexing |
| `GET` | `/api/video-status/{id}` | Poll processing progress |
| `POST` | `/api/search-by-image` | Run visual similarity search |
| `GET` | `/api/results/{id}` | Get cached search results |
| `GET` | `/api/video/{id}` | Stream the video (supports Range requests) |
| `GET` | `/api/video-info/{id}` | Get stored video metadata |
| `GET` | `/frames/{id}/{file}` | Serve frame thumbnail |
| `GET` | `/health` | Health check |

### Example: Upload + Process + Search (curl)

```bash
# 1. Upload video
VIDEO_ID=$(curl -s -X POST http://localhost:8000/api/upload-video \
  -F "file=@/path/to/video.mp4" | python3 -c "import sys,json; print(json.load(sys.stdin)['video_id'])")

# 2. Start processing
curl -X POST http://localhost:8000/api/process-video \
  -H "Content-Type: application/json" \
  -d "{\"video_id\": \"$VIDEO_ID\", \"fps\": 1.0}"

# 3. Poll until done
watch -n 1 "curl -s http://localhost:8000/api/video-status/$VIDEO_ID | python3 -m json.tool"

# 4. Search with query image
curl -X POST http://localhost:8000/api/search-by-image \
  -F "video_id=$VIDEO_ID" \
  -F "top_k=10" \
  -F "file=@/path/to/query.jpg"
```

---

## ⚡ Processing Pipeline (Technical)

```
Video file / YouTube URL
        │
        ▼
  OpenCV frame extraction
  (1 frame/sec by default)
        │
        ▼
  CLIP ViT-B/32 image encoder
  → 512-dim L2-normalized embedding per frame
        │
        ▼
  FAISS IndexFlatIP (inner product = cosine similarity)
  → Sub-millisecond similarity search
        │
        ▼
  Query image → CLIP embedding → FAISS search
  → Top-K results with timestamps + scores
```

---

## 🎛 Configuration

### Change frame extraction rate
Use the FPS selector in the UI (0.5/1/2 FPS) or pass `fps` in the API request.

Higher FPS = more precise results but longer processing time and larger index.

### Use a more accurate CLIP model
Edit `backend/services/embedding_service.py`:
```python
MODEL_NAME = "openai/clip-vit-large-patch14"  # ~307M params, 768-dim
EMBEDDING_DIM = 768
```

### Increase max video size
Edit `backend/utils/file_utils.py`:
```python
MAX_VIDEO_SIZE_MB = 1000  # 1 GB
```

---

## 🛠 Troubleshooting

**"yt-dlp not found"**
```bash
pip install yt-dlp
# or
pip install --upgrade yt-dlp
```

**"CUDA out of memory"**
Reduce batch size in `embedding_service.py`:
```python
compute_batch_embeddings(frame_paths, batch_size=8)
```

**"Video not playing in browser"**
Convert to H.264 MP4 for best browser compatibility:
```bash
ffmpeg -i input.mkv -c:v libx264 -c:a aac output.mp4
```

**Frontend can't reach backend**
Ensure the backend is running on port 8000. Check `frontend/src/services/api.js` and update `BASE_URL` if needed.

---

## 📦 Dependencies

### Backend
- **FastAPI** — async Python web framework
- **OpenCV** — frame extraction
- **HuggingFace Transformers** — CLIP model
- **PyTorch** — deep learning runtime
- **FAISS** — vector similarity search
- **yt-dlp** — YouTube downloading
- **Pillow** — image processing

### Frontend
- **React 18** — UI framework
- **Axios** — HTTP client
- **Lucide React** — icons

---

## 📄 License

MIT — use freely.
