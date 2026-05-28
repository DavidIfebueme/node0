'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getBreaches, scanInit, scanDetect, scanMap, scanComplete, getProfile } from '@/lib/api';
import { BreachCard } from '@/components/radar/breach-card';
import { MonospaceStat } from '@/components/ui/monospace-stat';
import { TerminalButton } from '@/components/ui/terminal-button';
import { useStore } from '@/lib/store';
import { Search } from 'lucide-react';
import { ScanProgress } from '@/components/radar/scan-progress';
import type { Breach } from '@/lib/types';

export default function Dashboard() {
  const [filter, setFilter] = useState('all');
  const [breaches, setBreaches] = useState<Breach[]>([]);
  const [profile, setProfile] = useState<{ companyName: string; industry: string; targetCount: number } | null>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const { isScanning, setScanning, scanProgress, setScanProgress } = useStore();

  useEffect(() => {
    getBreaches().then(setBreaches).catch(console.error);
    getProfile().then(setProfile).catch(console.error);
  }, []);

  const handleScan = useCallback(async () => {
    if (isScanning) return;
    setScanning(true);
    setScanProgress(5);
    setScanLog([]);

    const log = (msg: string) => setScanLog(prev => [...prev.slice(-15), msg]);

    try {
      log('initializing scan...');
      const init = await scanInit();
      log(`scan initialized for ${init.profile?.companyName || 'your org'} — monitoring ${init.targetCount} targets`);
      setScanProgress(10);

      log('detecting breaches across your vendor ecosystem...');
      setScanProgress(20);
      const detectResult = await scanDetect();
      const detectedBreaches: Breach[] = detectResult.breaches || [];
      log(`detected ${detectedBreaches.length} breaches`);
      setScanProgress(35);

      for (let i = 0; i < detectedBreaches.length; i++) {
        const breach = detectedBreaches[i];
        const progress = 35 + (i / detectedBreaches.length) * 50;
        setScanProgress(progress);

        log(`mapping ${breach.companyName} vendor network...`);
        const mapResult = await scanMap(breach.id);
        log(`${breach.companyName}: ${mapResult.vendors} vendors, ${mapResult.prospects} prospects in blast zone`);
      }

      log('finalizing scan results...');
      setScanProgress(90);
      await scanComplete();

      const updated = await getBreaches();
      setBreaches(updated);
      const updatedProfile = await getProfile();
      setProfile(updatedProfile);
      setScanProgress(100);
      log(`scan complete — ${updated.length} breaches, ${updated.reduce((sum, b) => sum + b.mappedNodesCount, 0)} nodes mapped`);
    } catch (err) {
      log(`error: ${err instanceof Error ? err.message : 'scan failed'}`);
      console.error('scan failed:', err);
    } finally {
      setScanning(false);
    }
  }, [isScanning, setScanning, setScanProgress]);

  const filteredBreaches = breaches.filter(b => {
    if (filter === 'critical') return b.severity === 'CRITICAL';
    if (filter === 'high') return b.severity === 'HIGH' || b.severity === 'CRITICAL';
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8 max-w-7xl mx-auto w-full gap-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary border-b border-border-default pb-4">
        <MonospaceStat label="breaches detected" value={breaches.length} />
        <span className="text-border-muted">│</span>
        <MonospaceStat label="active traces" value={breaches.filter(b => b.severity === 'CRITICAL' || b.severity === 'HIGH').length} />
        <span className="text-border-muted">│</span>
        <MonospaceStat label="targets monitored" value={profile?.targetCount || 0} />
        <span className="text-border-muted">│</span>
        <div className="flex items-center gap-2">
          <span>scanning for:</span>
          <span className="text-accent-cyan">{profile?.companyName || '...'}</span>
          <span className="text-text-dim">({profile?.industry || '...'})</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar border border-border-default bg-bg-surface">
        <div className="px-4 py-2 border-b border-border-muted flex items-center gap-2 text-xs text-text-dim sticky top-0 bg-bg-surface z-10">
          <span>//// radar feed</span>
          {isScanning ? (
            <>
              <span className="text-accent-cyan">— scanning</span>
              <span className="inline-block w-1.5 h-3 bg-accent-cyan animate-pulse ml-1" />
            </>
          ) : (
            <>
              <span className="text-accent-cyan">— live</span>
              <span className="inline-block w-1.5 h-3 bg-accent-cyan animate-pulse ml-1" />
            </>
          )}
        </div>

        {isScanning && scanLog.length > 0 && (
          <div className="px-4 py-2 border-b border-border-muted bg-accent-cyan/5 text-xs font-mono text-accent-cyan max-h-32 overflow-y-auto">
            {scanLog.map((msg, i) => (
              <div key={i} className="py-0.5">▸ {msg}</div>
            ))}
          </div>
        )}

        {filteredBreaches.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-text-dim text-sm">
            {isScanning ? 'scanning for breaches...' : 'no breaches detected — initiate a scan'}
          </div>
        ) : (
          filteredBreaches.map((breach, idx) => (
            <BreachCard key={breach.id} breach={breach} index={idx} />
          ))
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-border-default flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <TerminalButton onClick={handleScan} className="w-full md:w-auto">
            <Search size={14} />
            {isScanning ? 'scanning...' : '+ initiate scan'}
          </TerminalButton>
          <ScanProgress progress={scanProgress} isScanning={isScanning} />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'critical', 'high', 'this week'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-mono text-xs px-3 py-1 border transition-colors ${filter === f ? 'border-text-secondary text-text-primary bg-bg-elevated' : 'border-border-muted text-text-secondary hover:border-border-default'}`}
            >
              [{f}]
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
