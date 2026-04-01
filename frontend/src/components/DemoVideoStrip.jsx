import React, { useState, useCallback } from 'react';
import styles from '../App.module.css';

export default function DemoVideoStrip({ disabled, onLoad, fps }) {
  const [loading, setLoading] = useState('');

  const demos = [
    { id: 'nature', url: 'C:\Users\Yassine\Desktop\video-visual-search\frontend\public\videos\demo1.mp4', label: 'Nature' },
    { id: 'city', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', label: 'City' },
  ];

  const handleLoad = useCallback(async (demo) => {
    if (disabled || loading === demo.id) return;
    setLoading(demo.id);
    try {
      const res = await fetch(demo.url);
      const blob = await res.blob();
      const file = new File([blob], `${demo.label}.mp4`, { type: 'video/mp4' });
      onLoad(file, fps);
    } catch (e) {
      console.error('Demo load failed');
    } finally {
      setLoading('');
    }
  }, [disabled, loading, onLoad, fps]);

  return (
    <div className={styles.demoVideos}>
      {demos.map((demo) => (
        <div key={demo.id} className={`${styles.stripThumb} ${loading === demo.id ? styles.stripThumbActive : ''}`} title={`Load ${demo.label}`}>
          <video src={demo.url} className={styles.stripVideo} muted loop playsInline />
          <div className={styles.stripLabel}>{demo.label}</div>
          <button 
            className={styles.stripLoadBtn}
            onClick={() => handleLoad(demo)}
            disabled={disabled || loading === demo.id}
          >
            {loading === demo.id ? '⏳' : '↑'}
          </button>
        </div>
      ))}
    </div>
  );
}

