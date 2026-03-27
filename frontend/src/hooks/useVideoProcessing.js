/**
 * Custom hook: manages the full video processing workflow.
 * Handles upload → process → poll progress → ready state.
 */
import { useState, useRef, useCallback } from 'react';
import {
  uploadVideo,
  downloadYouTube,
  processVideo,
  getVideoStatus,
  getVideoStreamUrl,
} from '../services/api';

const POLL_INTERVAL_MS = 1200;

export function useVideoProcessing() {
  const [videoId, setVideoId]           = useState(null);
  const [videoUrl, setVideoUrl]         = useState(null);
  const [stage, setStage]               = useState('idle'); // idle | uploading | pending | processing | ready | error
  const [progress, setProgress]         = useState(0);
  const [progressMsg, setProgressMsg]   = useState('');
  const [framesProcessed, setFramesDone]= useState(0);
  const [totalFrames, setTotalFrames]   = useState(0);
  const [error, setError]               = useState(null);
  const [videoInfo, setVideoInfo]       = useState(null);
  const [fps, setFps]                   = useState(1.0);

  const pollRef = useRef(null);
  const uploadProgressRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Poll for progress ──────────────────────────────────────────────────────
  const startPolling = useCallback((id) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await getVideoStatus(id);
        setProgress(status.progress);
        setProgressMsg(status.message);
        setFramesDone(status.frames_processed || 0);
        setTotalFrames(status.total_frames || 0);

        if (status.stage === 'done') {
          setStage('ready');
          setVideoUrl(getVideoStreamUrl(id));
          stopPolling();
        } else if (status.stage === 'error') {
          setStage('error');
          setError(status.message);
          stopPolling();
        } else if (status.stage === 'pending') {
          // Still downloading (YouTube case)
          setStage('pending');
        } else {
          setStage('processing');
        }
      } catch (e) {
        // Ignore transient errors during polling
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  // ── Upload local file ──────────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (file, selectedFps) => {
    setError(null);
    setStage('uploading');
    setProgress(0);
    setProgressMsg('Uploading video…');

    try {
      const data = await uploadVideo(file, (pct) => {
        uploadProgressRef.current = pct;
        setProgress(pct / 100);
        setProgressMsg(`Uploading… ${pct}%`);
      });

      setVideoId(data.video_id);
      setVideoInfo(data);
      setStage('pending');
      setProgress(0);
      setProgressMsg('Upload complete. Starting processing…');

      // Immediately trigger processing
      await processVideo(data.video_id, selectedFps || fps);
      setStage('processing');
      startPolling(data.video_id);
    } catch (err) {
      setStage('error');
      setError(err.response?.data?.detail || err.message || 'Upload failed');
    }
  }, [fps, startPolling]);

  // ── YouTube URL ────────────────────────────────────────────────────────────
  const handleYouTubeUrl = useCallback(async (url, selectedFps) => {
    setError(null);
    setStage('uploading');
    setProgress(0);
    setProgressMsg('Submitting YouTube URL…');

    try {
      const data = await downloadYouTube(url);
      setVideoId(data.video_id);
      setVideoInfo(data);
      setStage('pending');
      setProgressMsg('Downloading from YouTube…');

      // Poll until download finishes, then trigger processing
      const waitForDownload = async () => {
        const checkInterval = setInterval(async () => {
          try {
            const status = await getVideoStatus(data.video_id);
            setProgress(status.progress);
            setProgressMsg(status.message);

            if (status.stage === 'pending') {
              // Download complete, now process
              clearInterval(checkInterval);
              await processVideo(data.video_id, selectedFps || fps);
              setStage('processing');
              startPolling(data.video_id);
            } else if (status.stage === 'error') {
              clearInterval(checkInterval);
              setStage('error');
              setError(status.message);
            }
          } catch (e) { /* ignore */ }
        }, POLL_INTERVAL_MS);
      };

      waitForDownload();
    } catch (err) {
      setStage('error');
      setError(err.response?.data?.detail || err.message || 'YouTube download failed');
    }
  }, [fps, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setVideoId(null);
    setVideoUrl(null);
    setStage('idle');
    setProgress(0);
    setProgressMsg('');
    setFramesDone(0);
    setTotalFrames(0);
    setError(null);
    setVideoInfo(null);
  }, [stopPolling]);

  return {
    // State
    videoId, videoUrl, stage, progress, progressMsg,
    framesProcessed, totalFrames, error, videoInfo, fps,
    // Actions
    setFps, handleFileUpload, handleYouTubeUrl, reset,
    isProcessing: ['uploading', 'pending', 'processing'].includes(stage),
    isReady: stage === 'ready',
  };
}
