/**
 * VideoPlayer — native HTML5 video with timestamp-seek support.
 */
import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import styles from './VideoPlayer.module.css';
import { Play } from 'lucide-react';

const VideoPlayer = forwardRef(function VideoPlayer({ src }, ref) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  // Expose seekTo(seconds) to parent
  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        videoRef.current.play().catch(() => {});
        setPlaying(true);
      }
    },
  }));

  const handleClick = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {!error ? (
        <video
          ref={videoRef}
          src={src}
          className={styles.video}
          controls
          preload="metadata"
          onClick={handleClick}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setError(true)}
        />
      ) : (
        <div className={styles.errorBox}>
          <Play size={28} />
          <p>Video preview unavailable</p>
          <span>The video file may still be processing or the format isn't supported by your browser.</span>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
