import React, { useEffect, useRef, useState } from 'react';
import styles from './IndexingModal.module.css';

const PIPELINE_STEPS = [
  { id: 'upload',  icon: '📤', label: 'Upload',         stages: ['uploading', 'pending'] },
  { id: 'extract', icon: '🎞️', label: 'Extract frames', stages: ['extracting'] },
  { id: 'embed',   icon: '🧠', label: 'CLIP encode',    stages: ['embedding'] },
  { id: 'index',   icon: '⚡', label: 'FAISS index',    stages: ['indexing'] },
  { id: 'done',    icon: '✅', label: 'Ready',          stages: ['done'] },
];

function getActiveStep(stage) {
  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    if (PIPELINE_STEPS[i].stages.includes(stage)) return i;
  }
  if (stage === 'processing') return 1;
  return 0;
}

export default function IndexingModal({ stage, progress, message, framesProcessed, totalFrames, error, onClose }) {
  const pct = Math.round((progress || 0) * 100);
  const activeStep = getActiveStep(stage);
  const isDone = stage === 'done';
  const isError = stage === 'error';
  const [elapsed, setElapsed] = useState(0);
  const [frameSlots, setFrameSlots] = useState([]);
  const timerRef = useRef(null);
  const prevFrames = useRef(0);

  useEffect(() => {
    if (!isDone && !isError) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isDone, isError]);

  useEffect(() => {
    if (totalFrames > 0 && frameSlots.length === 0) {
      setFrameSlots(Array(Math.min(totalFrames, 40)).fill('empty'));
    }
  }, [totalFrames]);

  useEffect(() => {
    if (totalFrames > 0 && framesProcessed > prevFrames.current) {
      const ratio = framesProcessed / totalFrames;
      const slots = Math.min(totalFrames, 40);
      const filled = Math.round(ratio * slots);
      setFrameSlots(prev => prev.map((s, i) => i < filled ? 'done' : i === filled ? 'active' : 'empty'));
      prevFrames.current = framesProcessed;
    }
  }, [framesProcessed, totalFrames]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.title}>Video Indexing Pipeline</div>
            <div className={styles.subtitle}>
              {isError ? 'An error occurred' : isDone ? 'Indexing complete!' : 'Processing your video…'}
            </div>
          </div>
          {(isDone || isError) && (
            <button className={styles.closeBtn} onClick={onClose}>
              {isDone ? '→ Start Searching' : '✕ Close'}
            </button>
          )}
        </div>

        <div className={styles.pipeline}>
          {PIPELINE_STEPS.map((step, i) => {
            const state = i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending';
            return (
              <React.Fragment key={step.id}>
                <div className={`${styles.step} ${styles['step_' + state]}`}>
                  <div className={styles.stepIcon}>{step.icon}</div>
                  <div className={styles.stepLabel}>{step.label}</div>
                  {state === 'active' && !isDone && <div className={styles.stepPulse} />}
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className={`${styles.connector} ${i < activeStep ? styles.connectorDone : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Frames indexed</div>
            <div className={styles.statVal}>{framesProcessed || 0}</div>
            <div className={styles.statSub}>of {totalFrames || '?'} total</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Embeddings</div>
            <div className={styles.statVal}>{framesProcessed || 0}</div>
            <div className={styles.statSub}>512-dim vectors</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Index size</div>
            <div className={styles.statVal}>{framesProcessed ? Math.round(framesProcessed * 2.1) : 0}</div>
            <div className={styles.statSub}>KB in memory</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Elapsed</div>
            <div className={styles.statVal}>{formatTime(elapsed)}</div>
            <div className={styles.statSub}>processing time</div>
          </div>
        </div>

        {totalFrames > 0 && (
          <div className={styles.framesSection}>
            <div className={styles.framesHeader}>
              <div className={styles.framesTitle}>Extracted frames</div>
              <div className={styles.framesCount}>{framesProcessed} / {totalFrames} frames</div>
            </div>
            <div className={styles.framesGrid}>
              {frameSlots.map((state, i) => (
                <div key={i} className={`${styles.frame} ${styles['frame_' + state]}`}>
                  <span className={styles.frameTs}>{Math.floor((i / Math.min(totalFrames, 40)) * totalFrames)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressMsg}>{isError ? `⚠ ${error}` : message}</span>
            <span className={styles.progressPct}>{isError ? '—' : `${pct}%`}</span>
          </div>
          <div className={styles.track}>
            <div className={`${styles.fill} ${isDone ? styles.fillDone : isError ? styles.fillError : styles.fillActive}`} style={{ width: `${isError ? 100 : pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}