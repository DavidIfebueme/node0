'use client';

import React, { use } from 'react';
import { MOCK_BREACHES, MOCK_PROSPECTS } from '@/lib/mock-data';
import { GlitchText } from '@/components/ui/glitch-text';
import { TerminalButton } from '@/components/ui/terminal-button';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import Link from 'next/link';
import '@xyflow/react/dist/style.css';
import { NetworkGraph } from '@/components/graph/network-graph';

export default function MapPage(props: { params: Promise<{ breachId: string }> }) {
  const params = use(props.params);
  const breachId = params.breachId;
  const breach = MOCK_BREACHES.find(b => b.id === breachId) || MOCK_BREACHES[0];
  const affectedProspects = MOCK_PROSPECTS.filter(p => p.breachId === breachId);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden absolute inset-0 pt-16">
      
      <div className="flex-1 relative bg-bg-primary/50">
        
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
          <div className="text-xs text-text-secondary bg-bg-surface/80 px-3 py-1.5 border border-border-default backdrop-blur-sm shadow-xl flex items-center gap-2">
            <span className="text-accent-red animate-pulse">●</span>
            <span className="text-text-primary">//// tracing:</span>
            <span className="font-bold">{breach.companyName}</span>
            <span>•</span>
            <span className="text-text-dim">[{breach.breachType}]</span>
          </div>
        </div>

        <NetworkGraph breachId={breachId} />

        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center z-10 pointer-events-none">
          <Link href="/dashboard" className="pointer-events-auto">
            <TerminalButton variant="ghost">
              <ArrowLeft size={14} /> back to radar
            </TerminalButton>
          </Link>
        </div>

      </div>

      <div className="w-[320px] bg-bg-surface border-l border-border-default shrink-0 flex flex-col z-20">
        <div className="p-4 border-b border-border-default">
          <div className="text-xs text-text-dim mb-4">//// blast summary</div>
          <h2 className="text-lg font-bold text-text-primary mb-1"><GlitchText>{breach.companyName} Exposure</GlitchText></h2>
          <div className="flex gap-2 text-xs mb-4">
            <span className="text-accent-red border border-accent-red/20 bg-accent-red/10 px-1">[{breach.severity}]</span>
            <span className="text-text-secondary uppercase">[{breach.breachType}]</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-6">
            <div>
              <div className="text-text-secondary mb-1">nodes mapped</div>
              <div className="text-lg text-text-primary">{breach.mappedNodesCount}</div>
            </div>
            <div>
              <div className="text-text-secondary mb-1">prospects</div>
              <div className="text-lg text-accent-cyan">{affectedProspects.length}</div>
            </div>
          </div>

          <Link href="/actions">
            <TerminalButton variant="primary" className="w-full justify-between group">
              <span>generate outreach</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </TerminalButton>
          </Link>
        </div>

        <div className="p-4 flex-1 overflow-y-auto hide-scrollbar">
          <div className="text-xs text-text-dim mb-4">//// targeted prospects</div>
          <div className="flex flex-col gap-3">
            {affectedProspects.map(prospect => (
              <div key={prospect.id} className="p-3 border border-border-default bg-bg-primary/50 hover:border-accent-cyan/50 cursor-pointer group transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-text-primary text-sm font-bold group-hover:text-accent-cyan transition-colors">{prospect.companyName}</span>
                  <span className="text-accent-cyan border border-accent-cyan/20 px-1 py-0.5 text-[10px]">
                    {Math.round(prospect.relevanceScore * 100)}% Match
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-dim">
                  <span>{prospect.connectionPath[0].name}</span>
                  <span>→</span>
                  <span>{prospect.connectionPath[1].name}</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
