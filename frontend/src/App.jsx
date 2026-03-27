/**
 * App.jsx — root application component.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │  Header                                              │
 *   ├─────────────────────┬────────────────────────────────┤
 *   │  Left sidebar       │  Main content                 │
 *   │  • Video upload     │  • Video player               │
 *   │  • Progress         │  • Results grid               │
 *   │  • Image search     │                               │
 *   └─────────────────────┴────────────────────────────────┘
 */
import React, { useRef } from 'react';
import { useVideoProcessing } from './hooks/useVideoProcessing';
import { useSearch } from './hooks/useSearch';
import { VideoUploadPanel } from './components/VideoUploadPanel';
import { ImageSearchPanel } from './components/ImageSearchPanel';
import { ProgressBar } from './components/ProgressBar';
import { ResultsGrid } from './components/ResultsGrid';
import VideoPlayer from './components/VideoPlayer';
import styles from './App.module.css';
import { Cpu, RotateCcw, Layers } from 'lucide-react';

export default function App() {
  const playerRef = useRef(null);

  // ── Video processing state ───────────────────────────────────────────────
  const {
    videoId, videoUrl, stage, progress, progressMsg,
    framesProcessed, totalFrames, error, fps,
    setFps, handleFileUpload, handleYouTubeUrl, reset,
    isProcessing, isReady,
  } = useVideoProcessing();

  // ── Search state ─────────────────────────────────────────────────────────
  const {
    queryImage, results, searching, searchError, queryTimeMs, topK,
    setTopK, handleImageSelect, runSearch, clearResults,
  } = useSearch();

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSeek = (timestamp) => {
    playerRef.current?.seekTo(timestamp);
    // Scroll video into view on mobile
    document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReset = () => {
    reset();
    clearResults();
  };

  const showProgress = stage !== 'idle' && stage !== 'ready' && stage !== 'error';
  const showError    = stage === 'error' || searchError;

  return (
    <div className={styles.app}>
      {/* ── Background glow ──────────────────────────────────────────────── */}
      <div className={styles.bgGlow} aria-hidden="true" />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}><Layers size={20} /></div>
          <span className={styles.logoText}>Video Visual Search</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.poweredBy}>
            <Cpu size={12} />
            CLIP + FAISS
          </div>
          {videoId && (
            <button className={styles.resetBtn} onClick={handleReset}>
              <RotateCcw size={13} /> New Video
            </button>
          )}
        </div>
      </header>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <main className={styles.main}>
        {/* ── Left Sidebar ────────────────────────────────────────────── */}
        <aside className={styles.sidebar}>
          {/* Step 1: Video */}
          <section className={styles.card}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNum}>01</div>
              <div>
                <div className={styles.stepTitle}>Load Video</div>
                <div className={styles.stepSub}>Upload or paste a YouTube URL</div>
              </div>
            </div>
            <VideoUploadPanel
              onFileUpload={handleFileUpload}
              onYouTubeUrl={handleYouTubeUrl}
              fps={fps}
              onFpsChange={setFps}
              disabled={isProcessing || isReady}
            />
          </section>

          {/* Progress */}
          {(showProgress || stage === 'error') && (
            <div className={`${styles.progressCard} fade-in`}>
              <ProgressBar
                stage={stage}
                progress={progress}
                message={error || progressMsg}
                framesProcessed={framesProcessed}
                totalFrames={totalFrames}
              />
            </div>
          )}

          {/* Step 2: Search */}
          <section className={`${styles.card} ${!isReady ? styles.cardDimmed : ''}`}>
            <div className={styles.stepHeader}>
              <div className={`${styles.stepNum} ${isReady ? styles.stepNumActive : ''}`}>02</div>
              <div>
                <div className={styles.stepTitle}>Search by Image</div>
                <div className={styles.stepSub}>Upload a query image to find matches</div>
              </div>
            </div>
            <ImageSearchPanel
              queryImage={queryImage}
              onImageSelect={handleImageSelect}
              onSearch={() => runSearch(videoId)}
              searching={searching}
              disabled={!isReady}
              topK={topK}
              onTopKChange={setTopK}
            />
          </section>

          {/* Search error */}
          {searchError && (
            <div className={styles.errorBanner}>
              ⚠ {searchError}
            </div>
          )}

          {/* Ready state badge */}
          {isReady && (
            <div className={`${styles.readyBadge} fade-in`}>
              <span className={styles.readyDot} /> Video indexed &amp; ready
            </div>
          )}
        </aside>

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <section className={styles.content}>
          {/* Video player */}
          <div id="video-section" className={styles.playerSection}>
            {videoUrl ? (
              <div className="fade-in">
                <div className={styles.sectionLabel}>
                  <span>VIDEO PREVIEW</span>
                  {videoId && (
                    <span className={styles.videoIdBadge}>{videoId.slice(0, 8)}…</span>
                  )}
                </div>
                <VideoPlayer ref={playerRef} src={videoUrl} />
              </div>
            ) : (
              <div className={styles.playerPlaceholder}>
                <div className={styles.placeholderInner}>
                  <div className={styles.placeholderIcon}>▶</div>
                  <div className={styles.placeholderTitle}>Video Player</div>
                  <div className={styles.placeholderSub}>
                    Upload or paste a YouTube URL to get started
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className={`${styles.resultsSection} fade-in`}>
              <div className={styles.sectionLabel}>
                <span>SEARCH RESULTS</span>
                <span className={styles.resultHint}>↓ Click any frame to seek video</span>
              </div>
              <ResultsGrid
                results={results}
                onSeek={handleSeek}
                queryTimeMs={queryTimeMs}
              />
            </div>
          )}

          {/* Empty / initial state */}
          {!videoUrl && results.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptySteps}>
                {[
                  { n: '1', label: 'Upload video or paste URL' },
                  { n: '2', label: 'System extracts frames & builds index' },
                  { n: '3', label: 'Upload a query image' },
                  { n: '4', label: 'See matching timestamps instantly' },
                ].map((step) => (
                  <div key={step.n} className={styles.emptyStep}>
                    <div className={styles.emptyStepNum}>{step.n}</div>
                    <div className={styles.emptyStepLabel}>{step.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
