'use client';

import { useState, useCallback } from 'react';
import { initiateScan } from '@/lib/api';
import { useStore } from '@/lib/store';

export function useScan() {
  const { isScanning, setScanning, scanProgress, setScanProgress } = useStore();
  const [error, setError] = useState<string | null>(null);

  const startScan = useCallback(async () => {
    if (isScanning) return;
    setScanning(true);
    setScanProgress(0);
    setError(null);

    try {
      await initiateScan();
      const interval = setInterval(() => {
        const prev = useStore.getState().scanProgress;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setScanning(false), 500);
          setScanProgress(100);
        } else {
          setScanProgress(prev + Math.floor(Math.random() * 15) + 5);
        }
      }, 300);
    } catch (e: any) {
      setError(e.message);
      setScanning(false);
    }
  }, [isScanning, setScanning, setScanProgress]);

  return { isScanning, scanProgress, error, startScan };
}
