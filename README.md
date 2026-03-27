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
VideoVisualSearch/
├── backend/
│   ├── api/routes.py                  # All FastAPI endpoints
│   ├── services/
│   │   ├── embedding_service.py       # CLIP model loading + inference
│   │   ├── video_service.py           # yt-dlp download + OpenCV extraction
│   │   ├── search_service.py          # FAISS index build/query
│   │   └── pipeline_service.py        # Orchestrates the full pipeline
│   ├── models/schemas.py              # Pydantic request/response models
│   ├── utils/file_utils.py            # Paths, helpers, timestamp formatting
│   ├── main.py                        # FastAPI app entrypoint
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── components/                # VideoUploadPanel, ImageSearchPanel, etc.
│   │   ├── hooks/                     # useVideoProcessing, useSearch
│   │   ├── services/api.js            # Axios API client
│   │   ├── App.jsx
│   │   └── index.css
│   └── Dockerfile
├── docker-compose.yml
├── start.sh
└── README.md
```

---

## ⚙️ Prerequisites

| Tool | Install |
|---|---|
| **Docker** | [docs.docker.com](https://docs.docker.com/get-docker/) |
| **Docker Compose** | Included with Docker Desktop |

That's it — no Python, Node.js, or ffmpeg needed locally. Everything runs inside containers.

---

## 🚀 Quick Start (Docker)

### 1. Clone the repo

```bash
git clone https://github.com/YassinChamakhi/VideoVisualSearch.git
cd VideoVisualSearch
```

### 2. Start everything

```bash
docker-compose up --build
```

This will:
- 🐍 Build and start the **FastAPI backend** on port `8000`
- ⚛️  Build and start the **React frontend** on port `3000`
- 📦 Download the CLIP model (~330 MB) on first run — cached for subsequent starts

### 3. Open the app

| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **Backend API docs** | http://localhost:8000/docs |

### 4. Stop the app

```bash
docker-compose down
```

---

## ⚡ Processing Pipeline

```
Video file / YouTube URL
        │
        ▼
  OpenCV frame extraction (1 fps by default)
        │
        ▼
  CLIP ViT-B/32 → 512-dim L2-normalized embedding per frame
        │
        ▼
  FAISS IndexFlatIP (cosine similarity)
        │
        ▼
  Query image → CLIP embedding → FAISS search → Top-K results
```

---

## 🔁 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload-video` | Upload a local video file |
| `POST` | `/api/download-youtube` | Download video from YouTube URL |
| `POST` | `/api/process-video` | Start frame extraction + FAISS indexing |
| `GET`  | `/api/video-status/{id}` | Poll processing progress |
| `POST` | `/api/search-by-image` | Run visual similarity search |
| `GET`  | `/api/results/{id}` | Get cached search results |
| `GET`  | `/api/video/{id}` | Stream the video (Range requests supported) |
| `GET`  | `/health` | Health check |

---

## 🎛 Configuration

### Change frame extraction rate
Use the FPS selector in the UI (0.5 / 1 / 2 FPS) or pass `fps` in the API.

### Use a larger CLIP model
Edit `backend/services/embedding_service.py`:
```python
MODEL_NAME    = "openai/clip-vit-large-patch14"  # 768-dim
EMBEDDING_DIM = 768
```

### Increase max video size
Edit `backend/utils/file_utils.py`:
```python
MAX_VIDEO_SIZE_MB = 1000  # 1 GB
```

---

## 🛠 Troubleshooting

**Containers won't start**
Make sure Docker Desktop is running, then try:
```bash
docker-compose down && docker-compose up --build
```

**CLIP model download is slow**
First run downloads ~330 MB — just wait. Subsequent starts use the cached model.

**"Video not playing in browser"**
Convert to H.264 MP4 for best compatibility:
```bash
ffmpeg -i input.mkv -c:v libx264 -c:a aac output.mp4
```

**Frontend can't reach backend**
Check `frontend/src/services/api.js` and make sure `BASE_URL` points to `http://localhost:8000`.

---

## 📦 Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, OpenCV, HuggingFace Transformers, PyTorch, FAISS, yt-dlp |
| Frontend | React 18, Axios, Lucide React |
| Infrastructure | Docker, Docker Compose |

---

## 📄 License

MIT — use freely.
