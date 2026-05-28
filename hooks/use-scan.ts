'use client';

import { useState, useCallback } from 'react';
import { scanInit, scanDetect, scanMap, scanComplete, getBreaches } from '@/lib/api';
import { useStore } from '@/lib/store';
import type { Breach } from '@/lib/types';

export function useScan() {
  const { isScanning, setScanning, scanProgress, setScanProgress } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [breaches, setBreaches] = useState<Breach[]>([]);

  const startScan = useCallback(async () => {
    if (isScanning) return;
    setScanning(true);
    setScanProgress(5);
    setError(null);
    setScanLog([]);

    const log = (msg: string) => setScanLog(prev => [...prev.slice(-15), msg]);

    try {
      log('initializing scan...');
      await scanInit();
      setScanProgress(10);

      log('detecting breaches...');
      setScanProgress(20);
      const detectResult = await scanDetect();
      const detected: Breach[] = detectResult.breaches || [];
      log(`detected ${detected.length} breaches`);
      setScanProgress(35);

      for (let i = 0; i < detected.length; i++) {
        const breach = detected[i];
        const progress = 35 + (i / detected.length) * 50;
        setScanProgress(progress);

        log(`mapping ${breach.companyName} vendor network...`);
        await scanMap(breach.id);
        log(`${breach.companyName} mapped`);
      }

      setScanProgress(90);
      await scanComplete();

      const updated = await getBreaches();
      setBreaches(updated);
      setScanProgress(100);
      log('scan complete');
    } catch (e: any) {
      setError(e.message);
      log(`error: ${e.message}`);
    } finally {
      setScanning(false);
    }
  }, [isScanning, setScanning, setScanProgress]);

  return { isScanning, scanProgress, error, scanLog, breaches, startScan };
}
