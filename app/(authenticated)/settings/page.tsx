'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getProfile } from '@/lib/api';
import { TerminalButton } from '@/components/ui/terminal-button';
import { CheckCircle, Building2, Target, Shield, Zap, Upload, Link2 } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ companyName: string; industry: string; targetCount: number; targets: Array<{ id: string; name: string; domain: string; industry: string }> } | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetDomain, setNewTargetDomain] = useState('');
  const [newTargetIndustry, setNewTargetIndustry] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [csvStatus, setCsvStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle');
  const [hubspotConnected, setHubspotConnected] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile().then(p => {
      setProfile(p);
      setCompanyName(p.companyName);
      setIndustry(p.industry);
    }).catch(err => setError('failed to load profile'));

    fetch('/api/crm/hubspot/status').then(r => r.json()).then(d => setHubspotConnected(d.connected)).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('hubspot') === 'connected') setHubspotConnected(true);
    if (params.get('hubspot') === 'error') setError('hubspot connection failed');
    if (params.get('hubspot')) window.history.replaceState({}, '', '/settings');
  }, []);

  const handleSaveProfile = () => {
    setError('');
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updateProfile: { companyName, industry, domain: companyName.toLowerCase().replace(/\s+/g, '') + '.io' } }),
    }).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }).catch(console.error);
  };

  const handleAddTarget = () => {
    if (!newTargetName || !newTargetDomain) return;
    const newTarget = {
      id: `t-${Date.now()}`,
      name: newTargetName,
      domain: newTargetDomain,
      industry: newTargetIndustry || 'Technology',
    };
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addTarget: newTarget }),
    }).then(() => {
      setProfile(prev => prev ? { ...prev, targets: [...prev.targets, newTarget], targetCount: prev.targetCount + 1 } : prev);
      setNewTargetName('');
      setNewTargetDomain('');
      setNewTargetIndustry('');
    }).catch(console.error);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setCsvStatus('error');
      setError('please upload a .csv file');
      return;
    }
    setCsvStatus('parsing');
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const hasHeader = lines[0]?.toLowerCase().includes('name') || lines[0]?.toLowerCase().includes('company');
      const dataLines = hasHeader ? lines.slice(1) : lines;
      const targets = dataLines.map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        return {
          name: cols[0] || '',
          domain: cols[1] || `${(cols[0] || '').toLowerCase().replace(/\s+/g, '')}.com`,
          industry: cols[2] || 'Technology',
        };
      }).filter(t => t.name.length > 1);
      if (targets.length === 0) {
        setCsvStatus('error');
        setError('no valid rows found in csv');
        return;
      }
      fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvTargets: targets }),
      }).then(() => {
        setCsvStatus('done');
        getProfile().then(p => setProfile(p));
        setTimeout(() => setCsvStatus('idle'), 3000);
      }).catch(() => {
        setCsvStatus('error');
        setError('failed to upload csv targets');
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8 h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
      
      <div>
        <h1 className="text-xl font-bold mb-2">Settings</h1>
        <p className="text-sm text-text-secondary">Your company profile determines what node0 scans for. We monitor for breaches that affect your target accounts through shared vendors, then generate outreach you can send to them.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Building2 size={14} /> //// your company
          </div>
          <div className="text-xs text-text-dim mb-3">this is who you are — the cybersecurity vendor using node0 to find sales opportunities</div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">company name</label>
              <input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary outline-none focus:border-accent-cyan"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">industry</label>
              <input
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary outline-none focus:border-accent-cyan"
              />
            </div>
            <div className="flex items-center justify-between">
              <TerminalButton onClick={handleSaveProfile} variant="primary">
                {saved ? <><CheckCircle size={14} className="text-accent-green" /> saved</> : 'save profile'}
              </TerminalButton>
            </div>
            {error && (
              <div className="text-accent-red text-xs bg-accent-red/5 border border-accent-red/20 p-2">{error}</div>
            )}
          </div>
        </section>

        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Shield size={14} /> //// how node0 works
          </div>
          <div className="flex flex-col gap-3 text-xs text-text-secondary">
            <div><span className="text-accent-red">1.</span> node0 detects when companies get breached (node0 = the breached company)</div>
            <div><span className="text-accent-orange">2.</span> maps the vendor blast radius — which other companies share vendors with the breached company</div>
            <div><span className="text-accent-cyan">3.</span> cross-references the blast zone with your target accounts</div>
            <div><span className="text-accent-green">4.</span> generates outreach: "your vendor X was just breached — we can help"</div>
            <div className="border-t border-border-muted pt-2 mt-2 text-text-dim">
              you sell security. node0 finds who needs it most, right now.
            </div>
          </div>
        </section>

        <section className="bg-bg-surface border border-border-default p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-border-muted pb-2">
            <div className="flex items-center gap-2 text-xs text-text-dim">
              <Target size={14} /> //// target accounts ({profile?.targetCount || 0})
            </div>
            <span className="text-xs text-text-dim">these are the companies you want to sell to — node0 alerts you when they enter a breach blast zone</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {profile?.targets.map(target => (
              <div key={target.id} className="p-3 border border-border-default bg-bg-primary/50">
                <div className="font-bold text-text-primary text-sm">{target.name}</div>
                <div className="text-xs text-text-dim">{target.domain} · {target.industry}</div>
              </div>
            ))}
          </div>

          <div className="border border-border-dashed p-4">
            <div className="text-xs text-text-dim mb-3">add target account</div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-text-secondary block mb-1">company name</label>
                <input
                  value={newTargetName}
                  onChange={e => setNewTargetName(e.target.value)}
                  placeholder="e.g. Notion"
                  className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary outline-none focus:border-accent-cyan"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-text-secondary block mb-1">domain</label>
                <input
                  value={newTargetDomain}
                  onChange={e => setNewTargetDomain(e.target.value)}
                  placeholder="e.g. notion.so"
                  className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary outline-none focus:border-accent-cyan"
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs text-text-secondary block mb-1">industry</label>
                <input
                  value={newTargetIndustry}
                  onChange={e => setNewTargetIndustry(e.target.value)}
                  placeholder="e.g. SaaS"
                  className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary outline-none focus:border-accent-cyan"
                />
              </div>
              <TerminalButton onClick={handleAddTarget} variant="primary">
                + add
              </TerminalButton>
            </div>
          </div>

          <div className="border border-border-dashed border-dashed p-4">
            <div className="text-xs text-text-dim mb-3">bulk import via csv</div>
            <div className="text-[10px] text-text-dim mb-2">format: name,domain,industry (one per row, header row optional)</div>
            <div className="flex items-center gap-3">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <TerminalButton onClick={() => csvInputRef.current?.click()} variant="ghost">
                <Upload size={14} /> {csvStatus === 'parsing' ? 'uploading...' : csvStatus === 'done' ? 'uploaded!' : csvStatus === 'error' ? 'error' : 'choose csv'}
              </TerminalButton>
              {csvStatus === 'done' && <span className="text-xs text-accent-green">targets imported</span>}
              {csvStatus === 'error' && <span className="text-xs text-accent-red">upload failed</span>}
            </div>
          </div>
        </section>

        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Zap size={14} /> //// data sources
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Bright Data Discover — ai-powered breach discovery', active: true },
              { label: 'Bright Data SERP API — google news search', active: true },
              { label: 'Web Unlocker — privacy policy & vendor page scraping', active: true },
              { label: 'AI Extraction — structured breach + vendor data from articles', active: true },
              { label: 'Vendor Customer Discovery — shared vendor tracing', active: true },
            ].map((src, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{src.label}</span>
                <div className={`w-3 h-3 border ${src.active ? 'border-accent-cyan bg-accent-cyan/30' : 'border-border-muted bg-bg-primary'}`} />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Link2 size={14} /> //// hubspot crm
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-xs text-text-dim mb-1">connect hubspot to sync contacts and push outreach directly to your crm pipeline</div>
            {hubspotConnected ? (
              <div className="flex items-center gap-2 text-xs text-accent-green">
                <CheckCircle size={14} /> hubspot connected
              </div>
            ) : (
              <TerminalButton
                onClick={() => window.location.href = '/api/crm/hubspot/install'}
                variant="primary"
              >
                <Link2 size={14} /> connect hubspot
              </TerminalButton>
            )}
          </div>
        </section>

        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Zap size={14} /> //// ai outreach engine
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>model:</span>
              <span className="text-text-primary">glm-4.5-air</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>provider:</span>
              <span className="text-text-primary">aiml api</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>capabilities:</span>
              <span className="text-text-primary">structured extraction + outreach generation</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-accent-green">
              <CheckCircle size={14} /> outreach generation active
            </div>
          </div>
        </section>
        
      </div>
    </div>
  );
}
