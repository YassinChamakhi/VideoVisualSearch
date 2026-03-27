/**
 * ProgressBar — animated processing progress indicator.
 */
import React from 'react';
import styles from './ProgressBar.module.css';

const STAGE_LABELS = {
  uploading:   'Uploading',
  pending:     'Preparing',
  downloading: 'Downloading',
  extracting:  'Extracting Frames',
  embedding:   'Computing Embeddings',
  indexing:    'Building Index',
  processing:  'Processing',
  done:        'Complete',
  error:       'Error',
};

export function ProgressBar({ stage, progress, message, framesProcessed, totalFrames }) {
  const pct = Math.round((progress || 0) * 100);
  const label = STAGE_LABELS[stage] || stage;
  const isDone  = stage === 'done';
  const isError = stage === 'error';

  return (
    <div className={`${styles.container} ${isError ? styles.errorState : ''}`}>
      <div className={styles.header}>
        <div className={styles.stageTag}>
          <span className={`${styles.dot} ${isDone ? styles.dotDone : isError ? styles.dotError : styles.dotActive}`} />
          {label}
        </div>
        <div className={styles.pct}>{isError ? '—' : `${pct}%`}</div>
      </div>

      <div className={styles.track}>
        <div
          className={`${styles.fill} ${isDone ? styles.fillDone : isError ? styles.fillError : styles.fillActive}`}
          style={{ width: `${isError ? 100 : pct}%` }}
        />
      </div>

      <div className={styles.footer}>
        <span className={styles.message}>{message}</span>
        {totalFrames > 0 && !isDone && !isError && (
          <span className={styles.frameCount}>
            {framesProcessed} / {totalFrames} frames
          </span>
        )}
      </div>
    </div>
  );
}
