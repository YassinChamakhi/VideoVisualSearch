/**
 * ImageSearchPanel — query image upload + search trigger.
 */
import React, { useRef, useCallback } from 'react';
import { ImageIcon, Search, X, Sliders } from 'lucide-react';
import styles from './ImageSearchPanel.module.css';

export function ImageSearchPanel({
  queryImage, onImageSelect, onSearch, searching,
  disabled, topK, onTopKChange,
}) {
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onImageSelect(file);
  }, [onImageSelect]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onImageSelect(file);
  };

  return (
    <div className={styles.panel}>
      {/* ── Image drop zone ─────────────────────────────────────────────── */}
      <div
        className={`${styles.dropzone} ${queryImage ? styles.hasImage : ''} ${disabled ? styles.disabledZone : ''}`}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={handleDrop}
        onClick={() => !disabled && !queryImage && fileInputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && !queryImage && fileInputRef.current?.click()}
        aria-label="Upload query image"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {queryImage ? (
          <div className={styles.previewWrapper}>
            <img
              src={queryImage.previewUrl}
              alt="Query"
              className={styles.preview}
            />
            <button
              className={styles.clearBtn}
              onClick={(e) => { e.stopPropagation(); onImageSelect(null); }}
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
            <div className={styles.previewLabel}>Query Image</div>
          </div>
        ) : (
          <div className={styles.prompt}>
            <ImageIcon size={28} className={styles.promptIcon} />
            <div className={styles.promptTitle}>Drop query image</div>
            <div className={styles.promptSub}>JPG, PNG, WebP supported</div>
          </div>
        )}
      </div>

      {disabled && !queryImage && (
        <p className={styles.hint}>Process a video first to enable search</p>
      )}

      {/* ── Top-K control ────────────────────────────────────────────────── */}
      <div className={styles.controlRow}>
        <div className={styles.controlLabel}>
          <Sliders size={12} /> Results
        </div>
        <div className={styles.topKButtons}>
          {[5, 10, 20].map((k) => (
            <button
              key={k}
              className={`${styles.kBtn} ${topK === k ? styles.kActive : ''}`}
              onClick={() => onTopKChange(k)}
              disabled={disabled}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search button ─────────────────────────────────────────────────── */}
      <button
        className={`${styles.searchBtn} ${searching ? styles.searching : ''}`}
        onClick={onSearch}
        disabled={!queryImage || disabled || searching}
      >
        <Search size={16} />
        {searching ? 'Searching…' : 'Find Similar Frames'}
      </button>
    </div>
  );
}
