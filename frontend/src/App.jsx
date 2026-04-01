import React, { useRef, useState } from 'react';
import { useVideoProcessing } from './hooks/useVideoProcessing';
import { useSearch } from './hooks/useSearch';
import { ProgressBar } from './components/ProgressBar';
import { ResultsGrid } from './components/ResultsGrid';
import VideoPlayer from './components/VideoPlayer';
import UploadModal from './components/UploadModal';
import IndexingModal from './components/IndexingModal';
import DemoPanel from './components/DemoPanel';
import styles from './App.module.css';
import { Layers, Cpu, RotateCcw, Plus } from 'lucide-react';

const DEMO_SAMPLES = [
  {
    id: 'demo1',
    label: 'Demo 1',
    videoSrc: '/videos/demo1.mp4',
    color: '#14b8a6',
    samples: [
      '/videos/demo1_a.jpg',
      '/videos/demo1_b.jpg',
      '/videos/demo1_c.jpg',
    ],
  },
  {
    id: 'demo2',
    label: 'Demo 2',
    videoSrc: '/videos/demo2.mp4',
    color: '#8b5cf6',
    samples: [
      '/videos/demo2_a.jpg',
      '/videos/demo2_b.jpg',
      '/videos/demo2_c.jpg',
    ],
  },
];

export default function App() {
  const playerRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [indexingModalOpen, setIndexingModalOpen] = useState(false);

  const {
    videoId, videoUrl, stage, progress, progressMsg,
    framesProcessed, totalFrames, error, fps,
    setFps, handleFileUpload, handleYouTubeUrl, reset, isProcessing, isReady,
  } = useVideoProcessing();

  const {
    queryImage, results, searching, searchError, queryTimeMs, topK,
    setTopK, handleImageSelect, runSearch, clearResults,
  } = useSearch();

  const handleSeek = (timestamp) => {
    playerRef.current?.seekTo(timestamp);
    document.getElementById('player-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReset = () => { reset(); clearResults(); setIndexingModalOpen(false); };

  // Open indexing modal as soon as a video starts processing
  const handleDemoLoad = async (demo) => {
    setIndexingModalOpen(true);
    await handleFileUpload(demo.videoSrc, fps);
  };

  const handleUploadFile = async (file) => {
    setModalOpen(false);
    setIndexingModalOpen(true);
    await handleFileUpload(file, fps);
  };

  const handleUploadUrl = async (url) => {
    setModalOpen(false);
    setIndexingModalOpen(true);
    await handleYouTubeUrl(url, fps);
  };

  // Close the indexing modal:
  // - If done: just dismiss it, keep the video ready for searching
  // - If error: full reset
  const handleIndexingModalClose = () => {
    if (stage === 'error') {
      handleReset();
    } else {
      setIndexingModalOpen(false);
    }
  };

  const showProgress = stage !== 'idle' && stage !== 'ready' && stage !== 'error';

  return (
    <div className={styles.app}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Layers size={18} />
          </div>
          <span className={styles.logoText}>Video Visual Search</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.poweredBy}>
            <Cpu size={11} /> CLIP + FAISS
          </div>
          {videoId && (
            <button className={styles.resetBtn} onClick={handleReset}>
              <RotateCcw size={12} /> New Session
            </button>
          )}
        </div>
      </header>

      <div className={styles.strip}>
        {DEMO_SAMPLES.map((demo) => (
          <button
            key={demo.id}
            className={styles.stripThumb}
            onClick={() => handleDemoLoad(demo)}
            disabled={isProcessing}
          >
            <video src={demo.videoSrc} className={styles.stripVideo} muted />
            <div className={styles.stripLabel}>{demo.label}</div>
          </button>
        ))}
        <button
          className={styles.uploadBtn}
          onClick={() => setModalOpen(true)}
          disabled={isProcessing}
        >
          <Plus size={18} />
          <span>Upload Video</span>
        </button>
      </div>

      <main className={styles.main}>
        <aside className={styles.sidebar}>
          <DemoPanel
            isReady={isReady}
            videoId={videoId}
            queryImage={queryImage}
            onImageSelect={handleImageSelect}
            onSearch={() => runSearch(videoId)}
            searching={searching}
            topK={topK}
            onTopKChange={setTopK}
            fps={fps}
            onFpsChange={setFps}
            isProcessing={isProcessing}
          />
          {(showProgress || stage === 'error') && (
            <div className={`${styles.progressWrap} fade-in`}>
              <ProgressBar
                stage={stage}
                progress={progress}
                message={error || progressMsg}
                framesProcessed={framesProcessed}
                totalFrames={totalFrames}
              />
            </div>
          )}
          {searchError && (
            <div className={styles.errorBanner}>⚠ {searchError}</div>
          )}
          {isReady && (
            <div className={`${styles.readyBadge} fade-in`}>
              <span className={styles.readyDot} /> Video indexed &amp; ready to search
            </div>
          )}
        </aside>

        <section className={styles.content}>
          <div id="player-section" className={styles.playerSection}>
            {videoUrl ? (
              <div className="fade-in">
                <div className={styles.sectionLabel}>
                  <span>VIDEO PREVIEW</span>
                  {videoId && (
                    <span className={styles.vidBadge}>
                      {videoId.slice(0, 8)}…
                    </span>
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
                    Upload a video or pick a demo to get started
                  </div>
                  <button
                    className={styles.placeholderUploadBtn}
                    onClick={() => setModalOpen(true)}
                  >
                    <Plus size={14} /> Upload Video
                  </button>
                </div>
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className={`${styles.resultsSection} fade-in`}>
              <div className={styles.sectionLabel}>
                <span>SEARCH RESULTS</span>
                <span className={styles.resultHint}>↓ Click any frame to seek</span>
              </div>
              <ResultsGrid
                results={results}
                onSeek={handleSeek}
                queryTimeMs={queryTimeMs}
              />
            </div>
          )}
        </section>
      </main>

      {/* Modals — always at root level so they overlay everything */}
      {modalOpen && (
        <UploadModal
          onClose={() => setModalOpen(false)}
          onFileUpload={handleUploadFile}
          onUrlUpload={handleUploadUrl}
        />
      )}

      {indexingModalOpen && (
        <IndexingModal
          stage={stage}
          progress={progress}
          message={error || progressMsg}
          framesProcessed={framesProcessed}
          totalFrames={totalFrames}
          error={error}
          onClose={handleIndexingModalClose}
        />
      )}
    </div>
  );
}