'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BreachCard } from '@/components/radar/breach-card';
import { MonospaceStat } from '@/components/ui/monospace-stat';
import { TerminalButton } from '@/components/ui/terminal-button';
import { useStore } from '@/lib/store';
import { Search, History, Filter } from 'lucide-react';
import { ScanProgress } from '@/components/radar/scan-progress';
import type { Breach, Prospect } from '@/lib/types';

export default function Dashboard() {
  const [filter, setFilter] = useState('all');
  const [scanLog, setScanLog] = useState<string[]>([]);
  const { isScanning, setScanning, scanProgress, setScanProgress, breaches, prospects, addBreach, addProspects, setLastScanAt } = useStore();
  const [targetCount, setTargetCount] = useState(0);
  const [scanHistory, setScanHistory] = useState<Array<{
    id: string; status: string; breachesFound: number; vendorsMapped: number;
    prospectsIdentified: number; startedAt: string; completedAt: string | null;
  }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [availableTargets, setAvailableTargets] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<string>>(new Set());
  const [scanAll, setScanAll] = useState(true);
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error' | 'empty'; message: string } | null>(null);
  const scanLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isScanning) setScanning(false);
    fetch('/api/profile').then(r => r.json()).then(d => {
      setTargetCount(d.targetCount || 0);
      if (d.targets) setAvailableTargets(d.targets.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
    }).catch(() => {});
    fetch('/api/scan-history').then(r => r.json()).then(d => setScanHistory(d.scans || [])).catch(() => {});
  }, []);

  const handleScan = useCallback(async () => {
    if (isScanning) return;
    setScanning(true);
    setScanProgress(5);
    setScanLog([]);
    setScanResult(null);

    const log = (msg: string) => {
      setScanLog(prev => [...prev.slice(-15), msg]);
      setTimeout(() => scanLogRef.current?.scrollTo({ top: scanLogRef.current.scrollHeight }), 10);
    };

    try {
      log('initializing scan...');
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'full',
          targetIds: scanAll ? null : Array.from(selectedTargetIds),
        }),
      });

      if (!res.ok || !res.body) throw new Error('scan request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (currentEvent === 'progress') {
                if (data.progress > 0) setScanProgress(Math.min(data.progress, 100));
                if (data.message) log(data.message);
              } else if (currentEvent === 'heartbeat') {
                // keep connection alive
              } else if (currentEvent === 'breach') {
                if (data.breach) {
                  addBreach(data.breach as Breach);
                }
              } else if (currentEvent === 'prospects') {
                if (data.prospects) {
                  addProspects(data.prospects as Prospect[]);
                }
              } else if (currentEvent === 'complete') {
                if (data.progress) setScanProgress(data.progress);
              } else if (currentEvent === 'error') {
                const msg = data.message || 'scan failed';
                log(`✕ ${msg}`);
                setScanResult({ type: 'error', message: msg });
              }
            } catch {}
          }
        }
      }

      if (!scanResult) {
        const { breaches: b, prospects: p } = useStore.getState();
        if (b.length === 0) {
          setScanResult({ type: 'empty', message: 'no new breaches found — try again later or adjust targets' });
        } else {
          setScanResult({ type: 'success', message: `scan complete — ${b.length} breach${b.length !== 1 ? 'es' : ''}, ${p.length} prospect${p.length !== 1 ? 's' : ''} in blast zone` });
        }
      }
    } catch (err) {
      log('scan failed — check connection');
      setScanResult({ type: 'error', message: 'scan failed — check connection' });
    } finally {
      setScanning(false);
      setLastScanAt(new Date().toISOString());
      fetch('/api/scan-history').then(r => r.json()).then(d => setScanHistory(d.scans || [])).catch(() => {});
    }
  }, [isScanning, setScanning, setScanProgress, addBreach, addProspects, setLastScanAt, scanAll, selectedTargetIds]);

  const filteredBreaches = breaches.filter(b => {
    if (filter === 'critical') return b.severity === 'CRITICAL';
    if (filter === 'high') return b.severity === 'HIGH' || b.severity === 'CRITICAL';
    if (filter === 'this week') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(b.detectedAt).getTime() >= weekAgo;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8 max-w-7xl mx-auto w-full gap-4">
      <div className="flex flex-col gap-2 border-b border-border-default pb-4">
        {breaches.length === 0 && !isScanning && !scanResult && (
          <div className="text-xs text-text-dim bg-bg-surface border border-border-default p-3">
            <span className="text-accent-cyan">node0</span> monitors for breaches, maps which vendors are shared with your target accounts, and generates outreach so you can sell security to exposed companies. hit scan to start.
          </div>
        )}
        {scanResult && !isScanning && (
          <div className={`text-xs p-3 border ${scanResult.type === 'success' ? 'text-accent-green bg-accent-green/5 border-accent-green/20' : scanResult.type === 'empty' ? 'text-text-dim bg-bg-surface border-border-default' : 'text-accent-red bg-accent-red/5 border-accent-red/20'}`}>
            {scanResult.message}
            <button onClick={() => setScanResult(null)} className="ml-3 underline hover:no-underline">dismiss</button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
          <MonospaceStat label="breaches detected" value={breaches.length} />
          <span className="text-border-muted">│</span>
          <MonospaceStat label="active traces" value={breaches.filter(b => b.severity === 'CRITICAL' || b.severity === 'HIGH').length} />
          <span className="text-border-muted">│</span>
          <MonospaceStat label="prospects in blast zone" value={prospects.length} />
          <span className="text-border-muted">│</span>
          <div className="flex items-center gap-2">
            <span>targets:</span>
            <span className="text-accent-cyan">{targetCount}</span>
            <span className="text-text-dim">companies</span>
          </div>
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
          <div ref={scanLogRef} className="px-4 py-2 border-b border-border-muted bg-accent-cyan/5 text-xs font-mono text-accent-cyan max-h-32 overflow-y-auto">
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

      <div className="mt-auto pt-4 border-t border-border-default flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <TerminalButton onClick={handleScan} className="w-full md:w-auto">
              <Search size={14} />
              {isScanning ? 'scanning...' : '+ initiate scan'}
            </TerminalButton>
            <ScanProgress progress={scanProgress} isScanning={isScanning} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTargetPicker(!showTargetPicker)}
              className={`flex items-center gap-1 font-mono text-xs px-3 py-1 border transition-colors ${showTargetPicker ? 'border-text-secondary text-text-primary bg-bg-elevated' : 'border-border-muted text-text-secondary hover:border-border-default'}`}
            >
              <Filter size={11} /> targets: {scanAll ? 'all' : selectedTargetIds.size}
            </button>
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

        {showTargetPicker && availableTargets.length > 0 && (
          <div className="border border-border-default bg-bg-surface p-3 max-h-40 overflow-y-auto hide-scrollbar">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-text-dim">select targets for next scan</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setScanAll(true); setSelectedTargetIds(new Set()); }}
                  className={`text-[10px] px-2 py-0.5 border transition-colors ${scanAll ? 'border-accent-cyan text-accent-cyan' : 'border-border-muted text-text-dim hover:text-text-secondary'}`}
                >
                  all
                </button>
                <button
                  onClick={() => setScanAll(false)}
                  className={`text-[10px] px-2 py-0.5 border transition-colors ${!scanAll ? 'border-accent-cyan text-accent-cyan' : 'border-border-muted text-text-dim hover:text-text-secondary'}`}
                >
                  custom
                </button>
              </div>
            </div>
            {!scanAll && (
              <div className="flex flex-wrap gap-1.5">
                {availableTargets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const next = new Set(selectedTargetIds);
                      if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                      setSelectedTargetIds(next);
                    }}
                    className={`text-[10px] px-2 py-0.5 border transition-colors ${selectedTargetIds.has(t.id) ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/5' : 'border-border-muted text-text-dim hover:text-text-secondary'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {scanHistory.length > 0 && (
        <div className="border border-border-default bg-bg-surface">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-text-dim hover:text-text-secondary transition-colors"
          >
            <span className="flex items-center gap-2">
              <History size={12} /> //// scan history ({scanHistory.length})
            </span>
            <span>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div className="border-t border-border-muted">
              <div className="flex text-[10px] text-text-dim border-b border-border-muted px-4 py-1.5 bg-bg-elevated">
                <div className="w-36">started</div>
                <div className="w-20">status</div>
                <div className="w-16 text-center">breaches</div>
                <div className="w-16 text-center">vendors</div>
                <div className="w-16 text-center">prospects</div>
                <div className="flex-1 text-right">duration</div>
              </div>
              {scanHistory.map(scan => {
                const start = new Date(scan.startedAt);
                const end = scan.completedAt ? new Date(scan.completedAt) : null;
                const duration = end ? Math.round((end.getTime() - start.getTime()) / 1000) : null;
                return (
                  <div key={scan.id} className="flex text-xs text-text-secondary border-b border-border-muted last:border-b-0 px-4 py-2">
                    <div className="w-36 text-text-dim">{start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="w-20">
                      <span className={scan.status === 'completed' ? 'text-accent-green' : 'text-accent-orange'}>
                        {scan.status}
                      </span>
                    </div>
                    <div className="w-16 text-center text-accent-red">{scan.breachesFound}</div>
                    <div className="w-16 text-center text-text-primary">{scan.vendorsMapped}</div>
                    <div className="w-16 text-center text-accent-cyan">{scan.prospectsIdentified}</div>
                    <div className="flex-1 text-right text-text-dim">{duration !== null ? `${duration}s` : '—'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
