/**
 * Custom hook: manages the query image upload and similarity search.
 */
import { useState, useCallback } from 'react';
import { searchByImage } from '../services/api';

export function useSearch() {
  const [queryImage, setQueryImage]     = useState(null);  // { file, previewUrl }
  const [results, setResults]           = useState([]);
  const [searching, setSearching]       = useState(false);
  const [searchError, setSearchError]   = useState(null);
  const [queryTimeMs, setQueryTimeMs]   = useState(null);
  const [topK, setTopK]                 = useState(10);

  const handleImageSelect = useCallback((file) => {
    if (!file) {
      setQueryImage(null);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setQueryImage({ file, previewUrl });
    setResults([]);
    setSearchError(null);
  }, []);

  const runSearch = useCallback(async (videoId) => {
    if (!queryImage?.file || !videoId) return;

    setSearching(true);
    setSearchError(null);
    setResults([]);

    try {
      const data = await searchByImage(videoId, queryImage.file, topK);
      setResults(data.results || []);
      setQueryTimeMs(data.query_time_ms);
    } catch (err) {
      setSearchError(err.response?.data?.detail || err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  }, [queryImage, topK]);

  const clearResults = useCallback(() => {
    setResults([]);
    setQueryImage(null);
    setQueryTimeMs(null);
    setSearchError(null);
  }, []);

  return {
    queryImage, results, searching, searchError, queryTimeMs, topK,
    setTopK, handleImageSelect, runSearch, clearResults,
  };
}
