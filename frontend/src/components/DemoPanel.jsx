import React, { useRef, useCallback } from 'react';
import { ImageIcon, Search, X, Sliders, Zap } from 'lucide-react';
import styles from './DemoPanel.module.css';

const DEMO_SAMPLES = [
  {
    id: 'demo1',
    label: 'Demo 1',
    videoSrc: '/videos/demo1.mp4',
    color: '#14b8a6',
    samples: [
      '/videos/demo1_a.jpg',  // ← replace with your image path
      '/videos/demo1_b.jpg',  // ← replace with your image path
      '/videos/demo1_c.jpg',  // ← replace with your image path
    ],
  },
  {
    id: 'demo2',
    label: 'Demo 2',
    videoSrc: '/videos/demo2.mp4',
    color: '#8b5cf6',
    samples: [
      '/videos/demo2_a.jpg',  // ← replace with your image path
      '/videos/demo2_b.jpg',  // ← replace with your image path
      '/videos/demo2_c.jpg',  // ← replace with your image path
    ],
  },
];

const FPS_OPTIONS = [
  { value: 0.5, label: '0.5 fps' },
  { value: 1.0, label: '1 fps' },
  { value: 2.0, label: '2 fps' },
];

export default function DemoPanel({ isReady, videoId, queryImage, onImageSelect, onSearch, searching, topK, onTopKChange, fps, onFpsChange, isProcessing }) {
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onImageSelect(file);
  }, [onImageSelect]);

  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) onImageSelect(file); };

  const handleSampleClick = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], 'sample.jpg', { type: blob.type });
      onImageSelect(file);
    } catch { console.error('Failed to load sample image'); }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.stepNum}>01</div>
          <div><div className={styles.stepTitle}>Frame Rate</div><div className={styles.stepSub}>Higher = more precise, slower</div></div>
        </div>
        <div className={styles.fpsButtons}>
          {FPS_OPTIONS.map((o) => (
            <button key={o.value} className={`${styles.fpsBtn} ${fps === o.value ? styles.fpsActive : ''}`} onClick={() => onFpsChange(o.value)} disabled={isProcessing}>{o.label}</button>
          ))}
        </div>
      </div>

      <div className={`${styles.card} ${!isReady ? styles.cardDimmed : ''}`}>
        <div className={styles.cardHeader}>
          <div className={`${styles.stepNum} ${isReady ? styles.stepActive : ''}`}>02</div>
          <div><div className={styles.stepTitle}>Query Image</div><div className={styles.stepSub}>Drop an image or pick a sample</div></div>
        </div>
        {DEMO_SAMPLES.map((demo) => (
          <div key={demo.id} className={styles.demoRow}>
            <div className={styles.demoLabel} style={{ color: demo.color }}>{demo.label}</div>
            <div className={styles.sampleGrid}>
              {demo.samples.map((src, i) => (
                <button key={i} className={styles.sampleThumb} onClick={() => handleSampleClick(src)} disabled={!isReady}>
                  <img src={src} alt={`Sample ${i+1}`} className={styles.sampleImg} />
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className={styles.divider}><span>or drop your own</span></div>
        <div className={`${styles.dropzone} ${queryImage ? styles.hasImage : ''} ${!isReady ? styles.disabledZone : ''}`}
          onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
          onClick={() => isReady && !queryImage && fileInputRef.current?.click()}
          role="button" tabIndex={isReady ? 0 : -1}
        >
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          {queryImage ? (
            <div className={styles.previewWrapper}>
              <img src={queryImage.previewUrl} alt="Query" className={styles.preview} />
              <button className={styles.clearBtn} onClick={(e) => { e.stopPropagation(); onImageSelect(null); }}><X size={12} /></button>
            </div>
          ) : (
            <div className={styles.dropPrompt}><ImageIcon size={22} className={styles.dropIcon} /><div className={styles.dropText}>Drop image here</div></div>
          )}
        </div>
      </div>

      <div className={`${styles.card} ${!isReady ? styles.cardDimmed : ''}`}>
        <div className={styles.cardHeader}>
          <div className={`${styles.stepNum} ${isReady ? styles.stepActive : ''}`}>03</div>
          <div><div className={styles.stepTitle}>Search</div><div className={styles.stepSub}>Find visually similar frames</div></div>
        </div>
        <div className={styles.controlRow}>
          <div className={styles.controlLabel}><Sliders size={11} /> Results</div>
          <div className={styles.topKButtons}>
            {[5, 10, 20].map((k) => (
              <button key={k} className={`${styles.kBtn} ${topK === k ? styles.kActive : ''}`} onClick={() => onTopKChange(k)} disabled={!isReady}>{k}</button>
            ))}
          </div>
        </div>
        <button className={`${styles.searchBtn} ${searching ? styles.searching : ''}`} onClick={onSearch} disabled={!queryImage || !isReady || searching}>
          {searching ? <><Zap size={15} /> Searching…</> : <><Search size={15} /> Find Similar Frames</>}
        </button>
      </div>
    </div>
  );
}