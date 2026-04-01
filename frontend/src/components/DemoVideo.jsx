import React, { useState, useCallback } from 'react';
import styles from '../App.module.css';  // Reuse strip styles

export default function DemoVideo({ url, label, onLoad }) {
  const [loading, setLoading] = useState(false);

  const handleLoad = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `${label}.mp4`, { type: 'video/mp4' });
      onLoad(file);
    } catch (e) {
      console.error('Demo video load failed');
    } finally {
      setLoading(false);
    }
  }, [url, label, onLoad]);

  return (
    <div className={styles.stripThumb} title={`Load ${label} demo`}>
      <video src={url} className={styles.stripVideo} muted loop playsInline />
      <div className={styles.stripLabel}>{label}</div>
      <button 
        className={styles.demoLoadBtn} 
        onClick={handleLoad} 
        disabled={loading}
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(139,92,246,0.8)',
          border: 'none',
          color: 'white',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        ↑
      </button>
    </div>
  );
}

