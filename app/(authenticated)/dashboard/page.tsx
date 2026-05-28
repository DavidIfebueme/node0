'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getBreaches, initiateScan } from '@/lib/api';
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
  const [scanMessages, setScanMessages] = useState<string[]>([]);
  const { isScanning, setScanning, scanProgress, setScanProgress } = useStore();

  useEffect(() => {
    getBreaches().then(setBreaches).catch(console.error);
  }, []);

  const handleScan = useCallback(async () => {
    if (isScanning) return;
    setScanning(true);
    setScanProgress(0);
    setScanMessages([]);

    try {
      const stream = await initiateScan();
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.progress > 0) setScanProgress(Math.min(data.progress, 100));
            if (data.detail) {
              setScanMessages(prev => [...prev.slice(-20), data.detail]);
            }
            if (data.stage === 'complete' || data.stage === 'error') {
              const updated = await getBreaches();
              setBreaches(updated);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('scan failed:', err);
    } finally {
      setScanning(false);
      setScanProgress(100);
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
        <MonospaceStat label="prospects in blast zone" value={scanMessages.filter(m => m.includes('blast zone')).length || '—'} />
        <span className="text-border-muted">│</span>
        <div className="flex items-center gap-2">
          <span>last scan:</span>
          <span className="text-text-primary">{isScanning ? 'running...' : breaches.length > 0 ? 'completed' : 'not yet'}</span>
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

        {isScanning && scanMessages.length > 0 && (
          <div className="px-4 py-2 border-b border-border-muted bg-accent-cyan/5 text-xs font-mono text-accent-cyan max-h-32 overflow-y-auto">
            {scanMessages.map((msg, i) => (
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
