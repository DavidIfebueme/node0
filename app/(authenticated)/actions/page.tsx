'use client';

import React, { useState } from 'react';
import { generateOutreach } from '@/lib/api';
import { useStore } from '@/lib/store';
import { TerminalButton } from '@/components/ui/terminal-button';
import { Send, FileText, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToneSelector } from '@/components/actions/tone-selector';

export default function ActionsPage() {
  const { prospects, breaches } = useStore();
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const selectedProspect = prospects.find(p => p.id === selectedProspectId) || prospects[0] || null;
  const [tone, setTone] = useState<'professional' | 'urgent' | 'casual'>('professional');
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedProspect) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedEmail(null);

    try {
      const breach = breaches.find(b => b.id === selectedProspect.breachId);
      const vendorName = selectedProspect.connectionPath[1]?.name || 'Unknown Vendor';
      const connectionPath = selectedProspect.connectionPath.map(p => `${p.type}: ${p.name}`).join(' → ');

      const result = await generateOutreach({
        breachTitle: breach?.title || '',
        breachCompany: breach?.companyName || '',
        breachType: breach?.breachType || '',
        breachSeverity: breach?.severity || '',
        breachDescription: breach?.description || '',
        vendorName,
        prospectCompany: selectedProspect.companyName,
        prospectIndustry: selectedProspect.industry,
        connectionPath,
      }, tone);
      setGeneratedEmail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectProspect = (id: string) => {
    setSelectedProspectId(id);
    setGeneratedEmail(null);
    setError(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] border-t border-border-default w-full p-4 md:p-6 gap-6 max-w-[1600px] mx-auto">
      
      <div className="w-full md:w-3/5 flex flex-col gap-4 overflow-hidden border border-border-default bg-bg-surface p-4">
        <div className="text-xs text-text-dim flex justify-between items-center">
          <span>//// prospects in blast zone</span>
          <span className="text-text-primary px-2 py-1 bg-bg-elevated">{prospects.length} total</span>
        </div>
        
        <div className="flex-1 overflow-auto hide-scrollbar">
          {prospects.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-text-dim text-sm">
              no prospects yet — run a scan first
            </div>
          ) : (
            <div className="min-w-[500px]">
              <div className="flex text-left text-sm border-b border-border-muted text-text-secondary">
                <div className="py-3 px-2 font-normal flex-1">company</div>
                <div className="py-3 px-2 font-normal w-24">industry</div>
                <div className="py-3 px-2 font-normal w-28">relevance</div>
                <div className="py-3 px-2 font-normal flex-1">connections</div>
              </div>
              {prospects.map(prospect => (
                <div
                  key={prospect.id}
                  onClick={() => handleSelectProspect(prospect.id)}
                  className={cn(
                    "flex items-center border-b border-border-muted cursor-pointer hover:bg-bg-elevated transition-colors text-sm",
                    (selectedProspect?.id === prospect.id) && "bg-bg-elevated border-l-2 border-l-accent-cyan"
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
          )}
        </div>
      </div>

      {selectedProspect ? (
        <div className="w-full md:w-2/5 flex flex-col gap-4 overflow-hidden border border-border-default bg-[#0a0a0f] p-4 flex-shrink-0 max-h-[50vh] md:max-h-none">
          <div className="text-xs text-text-dim flex justify-between items-center border-b border-border-muted pb-4">
            <span>//// compose outreach</span>
            <span className="flex items-center gap-1 text-accent-cyan"><Sparkles size={12}/> ai-generated</span>
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

          <ToneSelector tone={tone} onChange={(t) => { setTone(t); setGeneratedEmail(null); setError(null); }} />

          <TerminalButton
            onClick={handleGenerate}
            disabled={isGenerating}
            variant="primary"
            className="w-full"
          >
            {isGenerating ? (
              <><Loader2 size={14} className="animate-spin" /> generating...</>
            ) : (
              <><Sparkles size={14} /> generate outreach</>
            )}
          </TerminalButton>

          {error && (
            <div className="text-accent-red text-xs border border-accent-red/20 p-2 bg-accent-red/5">
              {error}
            </div>
          )}

          <div className="flex-1 bg-bg-primary border border-border-muted p-4 overflow-y-auto min-h-[120px]">
            {generatedEmail ? (
              <div className="text-sm text-text-primary font-mono leading-relaxed whitespace-pre-wrap">
                <div className="text-accent-cyan text-xs mb-2">subject: {generatedEmail.subject}</div>
                <div className="border-b border-border-muted mb-2" />
                {generatedEmail.body}
              </div>
            ) : (
              <div className="text-text-dim text-xs">
                {isGenerating ? 'generating with ai...' : 'click "generate outreach" to create a personalized message'}
              </div>
            )}
          </div>

          {generatedEmail && (
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
          )}
        </div>
      ) : (
        <div className="w-full md:w-2/5 flex items-center justify-center border border-border-default border-dashed text-text-dim text-sm">
          select a prospect to compose outreach
        </div>
      )}
    </div>
  );
}
