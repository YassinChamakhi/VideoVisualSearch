/**
 * VideoUploadPanel — handles local file upload or YouTube URL input.
 */
import React, { useState, useRef, useCallback } from 'react';
import { Upload, Youtube, Film, AlertCircle, ChevronDown } from 'lucide-react';
import styles from './VideoUploadPanel.module.css';

const FPS_OPTIONS = [
  { value: 0.5, label: '0.5 fps', desc: 'Every 2 seconds' },
  { value: 1.0, label: '1 fps',   desc: 'Every second (recommended)' },
  { value: 2.0, label: '2 fps',   desc: 'Every 0.5 seconds' },
];

export function VideoUploadPanel({ onFileUpload, onYouTubeUrl, fps, onFpsChange, disabled }) {
  const [mode, setMode]         = useState('file');   // 'file' | 'youtube'
  const [ytUrl, setYtUrl]       = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [localFile, setLocalFile] = useState(null);
  const fileInputRef = useRef(null);

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setLocalFile(file);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setLocalFile(file);
  };

  const handleSubmitFile = () => {
    if (localFile) onFileUpload(localFile, fps);
  };

  const handleSubmitYt = (e) => {
    e.preventDefault();
    if (ytUrl.trim()) onYouTubeUrl(ytUrl.trim(), fps);
  };

  return (
    <div className={styles.panel}>
      {/* ── Mode toggle ───────────────────────────────────────────────────── */}
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${mode === 'file' ? styles.active : ''}`}
          onClick={() => setMode('file')}
          disabled={disabled}
        >
          <Upload size={15} /> Local File
        </button>
        <button
          className={`${styles.modeBtn} ${mode === 'youtube' ? styles.active : ''}`}
          onClick={() => setMode('youtube')}
          disabled={disabled}
        >
          <Youtube size={15} /> YouTube URL
        </button>
      </div>

      {/* ── File upload ───────────────────────────────────────────────────── */}
      {mode === 'file' && (
        <div
          className={`${styles.dropzone} ${dragOver ? styles.dragActive : ''} ${localFile ? styles.hasFile : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label="Upload video file"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={disabled}
          />
          {localFile ? (
            <div className={styles.fileInfo}>
              <Film size={28} className={styles.fileIcon} />
              <div>
                <div className={styles.fileName}>{localFile.name}</div>
                <div className={styles.fileSize}>
                  {(localFile.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.dropPrompt}>
              <Upload size={32} className={styles.dropIcon} />
              <div className={styles.dropTitle}>Drop video here</div>
              <div className={styles.dropSub}>or click to browse · MP4, MKV, WebM · max 500 MB</div>
            </div>
          )}
        </div>
      )}

      {/* ── YouTube URL ───────────────────────────────────────────────────── */}
      {mode === 'youtube' && (
        <form className={styles.ytForm} onSubmit={handleSubmitYt}>
          <div className={styles.ytInputWrapper}>
            <Youtube size={18} className={styles.ytIcon} />
            <input
              type="url"
              className={styles.ytInput}
              placeholder="https://www.youtube.com/watch?v=…"
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              disabled={disabled}
              required
            />
          </div>
          <p className={styles.ytHint}>
            <AlertCircle size={12} /> yt-dlp will download the best available quality
          </p>
        </form>
      )}

      {/* ── FPS selector ──────────────────────────────────────────────────── */}
      <div className={styles.fpsRow}>
        <label className={styles.fpsLabel}>Frame rate</label>
        <div className={styles.fpsSelect}>
          <select
            value={fps}
            onChange={(e) => onFpsChange(parseFloat(e.target.value))}
            disabled={disabled}
          >
            {FPS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} — {o.desc}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectArrow} />
        </div>
      </div>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      {mode === 'file' ? (
        <button
          className={styles.submitBtn}
          onClick={handleSubmitFile}
          disabled={!localFile || disabled}
        >
          <Film size={16} />
          Process Video
        </button>
      ) : (
        <button
          className={styles.submitBtn}
          onClick={handleSubmitYt}
          disabled={!ytUrl.trim() || disabled}
          type="button"
        >
          <Youtube size={16} />
          Download &amp; Process
        </button>
      )}
    </div>
  );
}
