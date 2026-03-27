/**
 * ResultsGrid — displays search results as thumbnail cards with timestamps.
 * Clicking a result seeks the video player to that timestamp.
 */
import React from 'react';
import { Clock, Zap, ChevronRight } from 'lucide-react';
import styles from './ResultsGrid.module.css';

export function ResultsGrid({ results, onSeek, queryTimeMs }) {
  if (!results || results.length === 0) return null;

  return (
    <div className={styles.container}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.count}>{results.length}</div>
          <div className={styles.countLabel}>matches found</div>
        </div>
        {queryTimeMs !== null && (
          <div className={styles.queryTime}>
            <Zap size={12} />
            {queryTimeMs < 1000
              ? `${queryTimeMs.toFixed(0)}ms`
              : `${(queryTimeMs / 1000).toFixed(2)}s`}
          </div>
        )}
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className={styles.grid}>
        {results.map((result, i) => (
          <ResultCard
            key={`${result.timestamp}-${i}`}
            result={result}
            rank={i + 1}
            onSeek={onSeek}
          />
        ))}
      </div>
    </div>
  );
}

function ResultCard({ result, rank, onSeek }) {
  const scorePercent = Math.round(result.score * 100);
  const [imgError, setImgError] = React.useState(false);

  return (
    <button
      className={styles.card}
      onClick={() => onSeek(result.timestamp)}
      title={`Jump to ${result.time_label}`}
      style={{ '--rank-delay': `${rank * 0.04}s` }}
    >
      {/* ── Thumbnail ─────────────────────────────────────────────────── */}
      <div className={styles.thumbWrapper}>
        {!imgError ? (
          <img
            src={result.thumbnail_url}
            alt={`Frame at ${result.time_label}`}
            className={styles.thumb}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.thumbFallback}>
            <Clock size={20} />
          </div>
        )}

        {/* Rank badge */}
        <div className={styles.rankBadge}>#{rank}</div>

        {/* Score bar */}
        <div className={styles.scoreBarWrapper}>
          <div
            className={styles.scoreBar}
            style={{ width: `${scorePercent}%` }}
          />
        </div>

        {/* Play overlay */}
        <div className={styles.playOverlay}>
          <ChevronRight size={22} />
        </div>
      </div>

      {/* ── Meta ──────────────────────────────────────────────────────── */}
      <div className={styles.meta}>
        <div className={styles.timestamp}>
          <Clock size={11} />
          {result.time_label}
        </div>
        <div className={styles.score} style={{ '--score': scorePercent / 100 }}>
          {scorePercent}%
        </div>
      </div>
    </button>
  );
}
