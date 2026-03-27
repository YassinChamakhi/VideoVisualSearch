/**
 * API client for Video Visual Search backend.
 * All functions return promises; errors include a `.message` field.
 */
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000, // 5 min for large video uploads
});

// ── Video upload ──────────────────────────────────────────────────────────────

/**
 * Upload a local video file.
 * @param {File} file
 * @param {(progress: number) => void} onProgress
 * @returns {Promise<{video_id, filename, source, duration_seconds, message}>}
 */
export async function uploadVideo(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await client.post('/upload-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return res.data;
}

/**
 * Submit a YouTube URL for download.
 * @param {string} url
 * @returns {Promise<{video_id, message}>}
 */
export async function downloadYouTube(url) {
  const formData = new FormData();
  formData.append('url', url);
  const res = await client.post('/download-youtube', formData);
  return res.data;
}

// ── Processing ────────────────────────────────────────────────────────────────

/**
 * Start video processing pipeline.
 * @param {string} videoId
 * @param {number} fps Frames per second to extract (default 1)
 * @returns {Promise<{video_id, message}>}
 */
export async function processVideo(videoId, fps = 1.0) {
  const res = await client.post('/process-video', { video_id: videoId, fps });
  return res.data;
}

/**
 * Poll processing progress.
 * @param {string} videoId
 * @returns {Promise<{stage, progress, message, frames_processed, total_frames}>}
 */
export async function getVideoStatus(videoId) {
  const res = await client.get(`/video-status/${videoId}`);
  return res.data;
}

// ── Search ────────────────────────────────────────────────────────────────────

/**
 * Run visual similarity search with a query image.
 * @param {string} videoId
 * @param {File} imageFile
 * @param {number} topK
 * @returns {Promise<{video_id, results, query_time_ms}>}
 */
export async function searchByImage(videoId, imageFile, topK = 10) {
  const formData = new FormData();
  formData.append('video_id', videoId);
  formData.append('top_k', topK);
  formData.append('file', imageFile);

  const res = await client.post('/search-by-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// ── Misc ──────────────────────────────────────────────────────────────────────

export async function getVideoInfo(videoId) {
  const res = await client.get(`/video-info/${videoId}`);
  return res.data;
}

export function getVideoStreamUrl(videoId) {
  return `${BASE_URL}/video/${videoId}`;
}

export function getThumbnailUrl(relativePath) {
  // relativePath is e.g. "frames/video_id/frame_000001.jpg"
  return `http://localhost:8000/${relativePath}`;
}
