'use client';

import React, { useState, useMemo } from 'react';
import { generateOutreach } from '@/lib/api';
import { useStore } from '@/lib/store';
import { TerminalButton } from '@/components/ui/terminal-button';
import { Send, FileText, Sparkles, Loader2, Check, Copy, ArrowUpFromLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToneSelector } from '@/components/actions/tone-selector';

type Tone = 'professional' | 'urgent' | 'casual';

export default function ActionsPage() {
  const { prospects, breaches, savedOutreach, saveOutreach } = useStore();
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const selectedProspect = prospects.find(p => p.id === selectedProspectId) || prospects[0] || null;
  const [tone, setTone] = useState<Tone>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pushingToPipedrive, setPushingToPipedrive] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);
  const [selectedForPush, setSelectedForPush] = useState<Set<string>>(new Set());

  const cacheKey = selectedProspect ? `${selectedProspect.id}-${tone}` : '';
  const cached = cacheKey ? savedOutreach[cacheKey] : null;

  const handleGenerate = async (overrideTone?: Tone) => {
    if (!selectedProspect) return;
    const t = overrideTone || tone;
    const key = `${selectedProspect.id}-${t}`;
    if (savedOutreach[key]) return;

    setIsGenerating(true);
    setError(null);

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
      }, t);
      saveOutreach(key, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAllTones = async () => {
    if (!selectedProspect) return;
    for (const t of (['professional', 'urgent', 'casual'] as Tone[])) {
      const key = `${selectedProspect.id}-${t}`;
      if (!savedOutreach[key]) {
        await handleGenerate(t);
      }
    }
  };

  const handleCopy = () => {
    if (!cached) return;
    navigator.clipboard.writeText(`Subject: ${cached.subject}\n\n${cached.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenEmail = () => {
    if (!cached || !selectedProspect) return;
    const subject = encodeURIComponent(cached.subject);
    const body = encodeURIComponent(cached.body);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handlePushToPipedrive = async () => {
    const targetProspects = selectedForPush.size > 0
      ? prospects.filter(p => selectedForPush.has(p.id))
      : prospects;
    if (targetProspects.length === 0) return;
    setPushingToPipedrive(true);
    setPushResult(null);
    try {
      const payload = targetProspects.map(p => ({
        companyName: p.companyName,
        industry: p.industry,
        priority: p.priority,
        breachCompany: breaches.find(b => b.id === p.breachId)?.companyName || '',
        breachType: breaches.find(b => b.id === p.breachId)?.breachType || '',
      }));
      const res = await fetch('/api/crm/pipedrive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: payload }),
      });
      const data = await res.json();
      if (data.results) {
        const synced = data.results.filter((r: { status: string }) => r.status === 'syncd').length;
        const failed = data.results.filter((r: { status: string }) => r.status !== 'synced').length;
        setPushResult(failed > 0 ? `${synced}/${data.results.length} pushed, ${failed} failed` : `${synced} pushed to pipedrive`);
      } else {
        setPushResult(data.error || 'push failed');
      }
    } catch {
      setPushResult('push failed');
    } finally {
      setPushingToPipedrive(false);
      setTimeout(() => setPushResult(null), 5000);
    }
  };

  const breachGroups = useMemo(() => {
    const groups: Record<string, { breach: typeof breaches[0]; prospects: typeof prospects }> = {};
    for (const p of prospects) {
      const breach = breaches.find(b => b.id === p.breachId);
      if (!breach) continue;
      if (!groups[p.breachId]) groups[p.breachId] = { breach, prospects: [] };
      groups[p.breachId].prospects.push(p);
    }
    return Object.values(groups);
  }, [prospects, breaches]);

  const handleSelectProspect = (id: string) => {
    setSelectedProspectId(id);
    setError(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] border-t border-border-default w-full p-4 md:p-6 gap-6 max-w-[1600px] mx-auto">
      
      <div className="w-full md:w-3/5 flex flex-col gap-4 overflow-hidden border border-border-default bg-bg-surface p-4">
        <div className="text-xs text-text-dim flex justify-between items-center">
          <span>//// prospects in blast zone</span>
          <div className="flex items-center gap-2">
            {pushResult && <span className="text-xs text-accent-green">{pushResult}</span>}
            <TerminalButton
              onClick={handlePushToPipedrive}
              disabled={pushingToPipedrive || prospects.length === 0}
              variant="ghost"
              className="text-xs px-2 py-1"
            >
              {pushingToPipedrive ? <Loader2 size={12} className="animate-spin" /> : <ArrowUpFromLine size={12} />}
              {pushingToPipedrive ? 'pushing...' : selectedForPush.size > 0 ? `push ${selectedForPush.size} to pipedrive` : 'push all to pipedrive'}
            </TerminalButton>
            <span className="text-text-primary px-2 py-1 bg-bg-elevated">{prospects.length} total</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto hide-scrollbar">
          {prospects.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-text-dim text-sm">
              no prospects yet — run a scan first
            </div>
          ) : (
            <div className="min-w-[500px]">
              <div className="flex text-left text-sm border-b border-border-muted text-text-secondary">
                <div className="py-3 px-2 font-normal w-8">
                  <input
                    type="checkbox"
                    checked={selectedForPush.size === prospects.length && prospects.length > 0}
                    onChange={() => {
                      if (selectedForPush.size === prospects.length) {
                        setSelectedForPush(new Set());
                      } else {
                        setSelectedForPush(new Set(prospects.map(p => p.id)));
                      }
                    }}
                    className="accent-accent-cyan"
                  />
                </div>
                <div className="py-3 px-2 font-normal flex-1">company</div>
                <div className="py-3 px-2 font-normal w-24">industry</div>
                <div className="py-3 px-2 font-normal w-28">relevance</div>
                <div className="py-3 px-2 font-normal flex-1">connections</div>
              </div>
              {breachGroups.map(group => (
                <React.Fragment key={group.breach.id}>
                  <div className="flex items-center gap-2 py-2 px-2 bg-accent-red/5 border-b border-border-muted text-xs text-accent-red">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-red" />
                    <span className="font-bold">{group.breach.companyName}</span>
                    <span className="text-text-dim">— {group.breach.breachType.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="text-text-dim ml-auto">{group.prospects.length} prospect{group.prospects.length !== 1 ? 's' : ''}</span>
                  </div>
                  {group.prospects.map(prospect => (
                    <div
                      key={prospect.id}
                      className={cn(
                        "flex items-center border-b border-border-muted cursor-pointer hover:bg-bg-elevated transition-colors text-sm",
                        (selectedProspect?.id === prospect.id) && "bg-bg-elevated border-l-2 border-l-accent-cyan"
                      )}
                    >
                      <div className="py-4 px-2 w-8" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedForPush.has(prospect.id)}
                          onChange={() => {
                            setSelectedForPush(prev => {
                              const next = new Set(prev);
                              if (next.has(prospect.id)) next.delete(prospect.id);
                              else next.add(prospect.id);
                              return next;
                            });
                          }}
                          className="accent-accent-cyan"
                        />
                      </div>
                      <div className="py-4 px-2 flex-1" onClick={() => handleSelectProspect(prospect.id)}>
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
                        <span className="text-text-secondary">{prospect.connectionPath[0]?.name}</span> →
                        <span className="text-text-primary">{prospect.connectionPath[1]?.name}</span>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
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

          <ToneSelector tone={tone} onChange={(t) => { setTone(t); setError(null); }} />

          <TerminalButton
            onClick={() => handleGenerateAllTones()}
            disabled={isGenerating}
            variant="primary"
            className="w-full"
          >
            {isGenerating ? (
              <><Loader2 size={14} className="animate-spin" /> generating all tones...</>
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
            {cached ? (
              <div className="text-sm text-text-primary font-mono leading-relaxed whitespace-pre-wrap">
                <div className="text-accent-cyan text-xs mb-2">subject: {cached.subject}</div>
                <div className="border-b border-border-muted mb-2" />
                {cached.body}
              </div>
            ) : (
              <div className="text-text-dim text-xs">
                {isGenerating ? 'generating with ai...' : 'click "generate outreach" to create personalized messages for all tones'}
              </div>
            )}
          </div>

          {cached && (
            <div className="flex items-center justify-between gap-4 mt-auto">
              <TerminalButton onClick={handleCopy} variant="ghost" className="px-2">
                {copied ? <><Check size={14} className="text-accent-green" /> copied</> : <><Copy size={14} /> copy</>}
              </TerminalButton>
              <TerminalButton onClick={handleOpenEmail} variant="primary" className="flex-1">
                <Send size={14} /> open in email
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
