import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Globe, Film } from 'lucide-react';
import styles from './UploadModal.module.css';

export default function UploadModal({ onClose, onFileUpload, onUrlUpload }) {
  const [tab, setTab] = useState('file');
  const [dragOver, setDragOver] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) onFileUpload(file);
  }, [onFileUpload]);

  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) onFileUpload(file); };
  const handleUrlSubmit = () => { if (ytUrl.trim()) onUrlUpload(ytUrl.trim()); };
  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className={styles.backdrop} onClick={handleBackdrop}>
      <div className={styles.modal}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'file' ? styles.tabActive : ''}`} onClick={() => setTab('file')}><Film size={16} /> My Files</button>
          <button className={`${styles.tab} ${tab === 'url' ? styles.tabActive : ''}`} onClick={() => setTab('url')}><Globe size={16} /> Web Address</button>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {tab === 'file' && (
          <div className={styles.body}>
            <div className={`${styles.dropzone} ${dragOver ? styles.dragActive : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button" tabIndex={0}
            >
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} style={{ display: 'none' }} />
              <div className={styles.dropIcon}><Upload size={36} /></div>
              <div className={styles.dropTitle}>Drag and Drop a video here</div>
              <div className={styles.dropOr}>Or</div>
              <button className={styles.browseBtn} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse</button>
              <div className={styles.dropHint}>MP4, MKV, WebM, AVI · max 500 MB</div>
            </div>
          </div>
        )}

        {tab === 'url' && (
          <div className={styles.body}>
            <div className={styles.urlSection}>
              <div className={styles.urlLabel}>YouTube or public video URL:</div>
              <div className={styles.urlInputRow}>
                <input type="url" className={styles.urlInput} placeholder="https://www.youtube.com/watch?v=…" value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()} autoFocus />
                <button className={styles.urlSubmitBtn} onClick={handleUrlSubmit} disabled={!ytUrl.trim()}>→</button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.footerText}>powered by</span>
          <span className={styles.footerBrand}>CLIP + FAISS</span>
        </div>
      </div>
    </div>
  );
}