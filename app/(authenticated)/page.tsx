'use client';

import React, { useState } from 'react';
import { MOCK_BREACHES } from '@/lib/mock-data';
import { BreachCard } from '@/components/radar/breach-card';
import { MonospaceStat } from '@/components/ui/monospace-stat';
import { TerminalButton } from '@/components/ui/terminal-button';
import { useStore } from '@/lib/store';
import { Search } from 'lucide-react';
import { ScanProgress } from '@/components/radar/scan-progress';

export default function Dashboard() {
  const [filter, setFilter] = useState('all');
  const { isScanning, setScanning, scanProgress, setScanProgress } = useStore();

  const handleScan = () => {
    if (isScanning) return;
    setScanning(true);
    setScanProgress(0);
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
  };

  const filteredBreaches = MOCK_BREACHES.filter(b => {
    if (filter === 'critical') return b.severity === 'CRITICAL';
    if (filter === 'high') return b.severity === 'HIGH';
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8 max-w-7xl mx-auto w-full gap-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary border-b border-border-default pb-4">
        <MonospaceStat label="breaches detected" value={MOCK_BREACHES.length} />
        <span className="text-border-muted">│</span>
        <MonospaceStat label="active traces" value={3} />
        <span className="text-border-muted">│</span>
        <MonospaceStat label="prospects in blast zone" value={7} />
        <span className="text-border-muted">│</span>
        <div className="flex items-center gap-2">
          <span>last scan:</span>
          <span className="text-text-primary">2m ago</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar border border-border-default bg-bg-surface">
        <div className="px-4 py-2 border-b border-border-muted flex items-center gap-2 text-xs text-text-dim sticky top-0 bg-bg-surface z-10">
          <span>//// radar feed</span>
          <span className="text-accent-cyan">— live</span>
          <span className="inline-block w-1.5 h-3 bg-accent-cyan animate-pulse ml-1" />
        </div>
        {filteredBreaches.map((breach, idx) => (
          <BreachCard key={breach.id} breach={breach} index={idx} />
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-border-default flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <TerminalButton onClick={handleScan} className="w-full md:w-auto">
            <Search size={14} />
            {isScanning ? 'abort scan' : '+ initiate scan'}
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
