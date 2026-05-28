'use client';

import React, { useState } from 'react';
import { MOCK_PROSPECTS } from '@/lib/mock-data';
import { TerminalButton } from '@/components/ui/terminal-button';
import { Send, FileText, Check, ChevronDown, Sparkles } from 'lucide-react';
import { GlitchText } from '@/components/ui/glitch-text';
import { cn } from '@/lib/utils';

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
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-muted text-text-secondary">
                <th className="py-3 px-2 font-normal">company</th>
                <th className="py-3 px-2 font-normal">industry</th>
                <th className="py-3 px-2 font-normal">relevance</th>
                <th className="py-3 px-2 font-normal">connections</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PROSPECTS.map(prospect => (
                <tr 
                  key={prospect.id} 
                  onClick={() => setSelectedProspectId(prospect.id)}
                  className={cn(
                    "border-b border-border-muted cursor-pointer hover:bg-bg-elevated transition-colors",
                    selectedProspectId === prospect.id && "bg-bg-elevated border-l-2 border-l-accent-cyan"
                  )}
                >
                  <td className="py-4 px-2">
                    <div className="font-bold text-text-primary">{prospect.companyName}</div>
                    <div className="text-[10px] text-text-dim">[{prospect.priority}]</div>
                  </td>
                  <td className="py-4 px-2 text-text-secondary">{prospect.industry}</td>
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <div className="text-accent-cyan">{Math.round(prospect.relevanceScore * 100)}%</div>
                      <div className="w-16 h-1 bg-bg-primary">
                        <div className="h-full bg-accent-cyan" style={{ width: `${prospect.relevanceScore * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-xs text-text-dim">
                    <div className="flex items-center gap-1">
                      <span className="text-text-secondary">{prospect.connectionPath[0].name}</span> → 
                      <span className="text-text-primary">{prospect.connectionPath[1].name}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProspect ? (
        <div className="w-full md:w-2/5 flex flex-col gap-4 overflow-hidden border border-border-default bg-[#0a0a0f] p-4 flex-shrink-0">
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

          <div className="flex gap-1 bg-bg-surface p-1 border border-border-muted text-xs">
            {['professional', 'urgent', 'casual'].map(t => (
              <button 
                key={t}
                onClick={() => setTone(t as any)}
                className={cn("flex-1 py-1.5 text-center transition-colors", tone === t ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30" : "text-text-secondary hover:text-text-primary")}
              >
                [{t}]
              </button>
            ))}
          </div>

          <div className="flex-1 bg-bg-primary border border-border-muted p-4 overflow-y-auto">
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
