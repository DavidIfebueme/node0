'use client';

import React, { useState } from 'react';
import { MOCK_PROSPECTS } from '@/lib/mock-data';
import { TerminalButton } from '@/components/ui/terminal-button';
import { Send, FileText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToneSelector } from '@/components/actions/tone-selector';

export default function ActionsPage() {
  const [selectedProspectId, setSelectedProspectId] = useState(MOCK_PROSPECTS[0]?.id);
  const selectedProspect = MOCK_PROSPECTS.find(p => p.id === selectedProspectId);
  const [tone, setTone] = useState<'professional' | 'urgent' | 'casual'>('professional');

  const generatedEmail = selectedProspect ? {
    professional: `Subject: Vendor Risk: ${selectedProspect.connectionPath[0].name} Exposure via ${selectedProspect.connectionPath[1].name}\n\nHi team at ${selectedProspect.companyName},\n\nOur system (node0) detected a critical breach at ${selectedProspect.connectionPath[0].name}. Our mapping indicates your organization uses ${selectedProspect.connectionPath[1].name}, which places you within the blast radius of this incident.\n\nWe recommend immediate review of credentials connected to this vendor path. Let me know if you need assistance mapping your exposure.`,
    urgent: `Subject: URGENT: Potential breach exposure via ${selectedProspect.connectionPath[1].name}\n\nSecurity Team,\n\nWe are actively tracing a critical incident at ${selectedProspect.connectionPath[0].name}. You are connected to this event through ${selectedProspect.connectionPath[1].name}.\n\nThe exposure window is live. You must review your vendor access immediately to sever the connection path and contain potential risks.`,
    casual: `Subject: Heads up regarding the ${selectedProspect.connectionPath[0].name} breach\n\nHi there,\n\nYou might have seen the news about ${selectedProspect.connectionPath[0].name}. We just ran a trace and noticed ${selectedProspect.companyName} connects via ${selectedProspect.connectionPath[1].name}.\n\nJust wanted to give you a heads up so your team can rotate keys. Let's chat if you want to see the full network map.`
  } : null;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] border-t border-border-default w-full p-4 md:p-6 gap-6 max-w-[1600px] mx-auto">
      
      <div className="w-full md:w-3/5 flex flex-col gap-4 overflow-hidden border border-border-default bg-bg-surface p-4">
        <div className="text-xs text-text-dim flex justify-between items-center">
          <span>//// prospects in blast zone</span>
          <span className="text-text-primary px-2 py-1 bg-bg-elevated">{MOCK_PROSPECTS.length} total</span>
        </div>
        
        <div className="flex-1 overflow-auto hide-scrollbar">
          <div className="min-w-[500px]">
            <div className="flex text-left text-sm border-b border-border-muted text-text-secondary">
              <div className="py-3 px-2 font-normal flex-1">company</div>
              <div className="py-3 px-2 font-normal w-24">industry</div>
              <div className="py-3 px-2 font-normal w-28">relevance</div>
              <div className="py-3 px-2 font-normal flex-1">connections</div>
            </div>
            {MOCK_PROSPECTS.map(prospect => (
              <div
                key={prospect.id}
                onClick={() => setSelectedProspectId(prospect.id)}
                className={cn(
                  "flex items-center border-b border-border-muted cursor-pointer hover:bg-bg-elevated transition-colors text-sm",
                  selectedProspectId === prospect.id && "bg-bg-elevated border-l-2 border-l-accent-cyan"
                )}
              >
                <div className="py-4 px-2 flex-1">
                  <div className="font-bold text-text-primary">{prospect.companyName}</div>
                  <div className="text-[10px] text-text-dim">[{prospect.priority}]</div>
                </div>
                <div className="py-4 px-2 w-24 text-text-secondary">{prospect.industry}</div>
                <div className="py-4 px-2 w-28">
                  <div className="flex items-center gap-2">
                    <div className="text-accent-cyan">{Math.round(prospect.relevanceScore * 100)}%</div>
                    <div className="w-16 h-1 bg-bg-primary">
                      <div className="h-full bg-accent-cyan" style={{ width: `${prospect.relevanceScore * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="py-4 px-2 flex-1 text-xs text-text-dim">
                  <span className="text-text-secondary">{prospect.connectionPath[0].name}</span> →
                  <span className="text-text-primary">{prospect.connectionPath[1].name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedProspect ? (
        <div className="w-full md:w-2/5 flex flex-col gap-4 overflow-hidden border border-border-default bg-[#0a0a0f] p-4 flex-shrink-0 max-h-[50vh] md:max-h-none">
          <div className="text-xs text-text-dim flex justify-between items-center border-b border-border-muted pb-4">
            <span>//// compose outreach</span>
            <span className="flex items-center gap-1 text-accent-cyan"><Sparkles size={12}/> context-aware</span>
          </div>

          <div className="bg-bg-surface border border-border-muted p-3 flex flex-col gap-2">
            <div className="text-xs text-text-secondary">target profile</div>
            <div className="font-bold text-text-primary">{selectedProspect.companyName}</div>
            <div className="flex flex-col gap-1 mt-2 p-2 bg-bg-primary border border-border-muted text-xs font-mono">
              <div className="text-accent-red">▲ {selectedProspect.connectionPath[0].name} (Breached)</div>
              <div className="pl-3 text-text-secondary border-l border-border-muted ml-1.5 my-1">│ via {selectedProspect.connectionPath[1].name}</div>
              <div className="text-accent-cyan">▼ {selectedProspect.companyName} (Exposure)</div>
            </div>
          </div>

          <ToneSelector tone={tone} onChange={setTone} />

          <div className="flex-1 bg-bg-primary border border-border-muted p-4 overflow-y-auto min-h-[120px]">
            <textarea
              className="w-full h-full bg-transparent resize-none outline-none text-sm text-text-primary font-mono leading-relaxed hide-scrollbar"
              value={generatedEmail?.[tone]}
              readOnly
            />
          </div>

          <div className="flex items-center justify-between gap-4 mt-auto">
            <div className="flex gap-2">
              <TerminalButton variant="ghost" className="px-2">
                <FileText size={14} /> save
              </TerminalButton>
            </div>
            <TerminalButton variant="primary" className="flex-1">
              <Send size={14} /> send via integration
            </TerminalButton>
          </div>
        </div>
      ) : (
        <div className="w-full md:w-2/5 flex items-center justify-center border border-border-default border-dashed text-text-dim text-sm">
          select a prospect to compose outreach
        </div>
      )}
    </div>
  );
}
