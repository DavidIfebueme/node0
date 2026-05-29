'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getProfile } from '@/lib/api';
import { TerminalButton } from '@/components/ui/terminal-button';
import { CheckCircle, Building2, Target, Shield, Zap, Upload, Link2, Trash2, Pencil, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Target {
  id: string;
  name: string;
  domain: string;
  industry: string;
  source: string;
}

interface TargetsPage {
  targets: Target[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ companyName: string; industry: string; domain: string; targetCount: number; targets: Target[] } | null>(null);
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

  const [targetsData, setTargetsData] = useState<TargetsPage>({ targets: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  const [targetsSearch, setTargetsSearch] = useState('');
  const [targetsPage, setTargetsPage] = useState(1);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [showAllTargets, setShowAllTargets] = useState(false);

  const fetchTargets = useCallback(async (page: number, search: string) => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/targets?${params}`);
      if (res.ok) {
        const data: TargetsPage = await res.json();
        setTargetsData(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    getProfile().then(p => {
      setProfile(p);
      setCompanyName(p.companyName);
      setIndustry(p.industry);
    }).catch(() => setError('failed to load profile'));

    fetch('/api/crm/hubspot/status').then(r => r.json()).then(d => setHubspotConnected(d.connected)).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('hubspot') === 'connected') setHubspotConnected(true);
    if (params.get('hubspot') === 'error') setError('hubspot connection failed');
    if (params.get('hubspot')) window.history.replaceState({}, '', '/settings');
  }, []);

  useEffect(() => {
    if (showAllTargets) fetchTargets(targetsPage, targetsSearch);
  }, [showAllTargets, targetsPage, targetsSearch, fetchTargets]);

  const handleSaveProfile = () => {
    setError('');
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updateProfile: { companyName, industry, domain: companyName.toLowerCase().replace(/\s+/g, '') + '.io' } }),
    }).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }).catch(() => setError('failed to save profile'));
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
      getProfile().then(p => setProfile(p));
      if (showAllTargets) fetchTargets(targetsPage, targetsSearch);
      setNewTargetName('');
      setNewTargetDomain('');
      setNewTargetIndustry('');
    }).catch(() => setError('failed to add target'));
  };

  const handleDeleteTarget = (id: string) => {
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeTarget: id }),
    }).then(() => {
      getProfile().then(p => setProfile(p));
      if (showAllTargets) fetchTargets(targetsPage, targetsSearch);
    }).catch(() => setError('failed to delete target'));
  };

  const handleEditTarget = (target: Target) => {
    setEditingTarget(target);
    setEditName(target.name);
    setEditDomain(target.domain);
    setEditIndustry(target.industry);
  };

  const handleSaveEdit = () => {
    if (!editingTarget || !editName) return;
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updateTarget: { id: editingTarget.id, name: editName, domain: editDomain, industry: editIndustry } }),
    }).then(() => {
      setEditingTarget(null);
      getProfile().then(p => setProfile(p));
      if (showAllTargets) fetchTargets(targetsPage, targetsSearch);
    }).catch(() => setError('failed to update target'));
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
      if (lines.length === 0) {
        setCsvStatus('error');
        setError('csv file is empty');
        return;
      }

      const headerLine = lines[0].toLowerCase();
      const headerCols = headerLine.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

      const CRM_NAME_KEYS = ['company', 'company name', 'organization', 'account name', 'account', 'business name', 'firm', 'employer'];
      const CRM_DOMAIN_KEYS = ['website', 'domain', 'url', 'web url', 'company website', 'site'];
      const CRM_INDUSTRY_KEYS = ['industry', 'type', 'sector', 'category', 'business type'];
      const CRM_EMAIL_KEYS = ['email', 'e-mail', 'email address', 'work email'];

      function findColIndex(keys: string[]): number {
        for (const key of keys) {
          const idx = headerCols.findIndex(h => h === key || h.startsWith(key));
          if (idx !== -1) return idx;
        }
        return -1;
      }

      const nameIdx = findColIndex(CRM_NAME_KEYS);
      const domainIdx = findColIndex(CRM_DOMAIN_KEYS);
      const industryIdx = findColIndex(CRM_INDUSTRY_KEYS);
      const emailIdx = findColIndex(CRM_EMAIL_KEYS);

      const hasHeader = nameIdx !== -1 || headerCols.some(h => CRM_NAME_KEYS.includes(h) || CRM_DOMAIN_KEYS.includes(h) || CRM_INDUSTRY_KEYS.includes(h));
      const dataLines = hasHeader ? lines.slice(1) : lines;

      function extractDomain(raw: string, email: string): string {
        if (raw && raw.trim()) {
          let d = raw.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
          return d;
        }
        if (email && email.includes('@')) {
          return email.split('@')[1];
        }
        return '';
      }

      const targets = dataLines.map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const name = nameIdx !== -1 ? cols[nameIdx] || '' : cols[0] || '';
        const rawDomain = domainIdx !== -1 ? cols[domainIdx] || '' : cols[1] || '';
        const rawEmail = emailIdx !== -1 ? cols[emailIdx] || '' : '';
        const rawIndustry = industryIdx !== -1 ? cols[industryIdx] || '' : cols[2] || '';
        const domain = extractDomain(rawDomain, rawEmail) || `${name.toLowerCase().replace(/\s+/g, '')}.com`;
        return {
          name,
          domain,
          industry: rawIndustry || 'Technology',
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
        if (showAllTargets) fetchTargets(targetsPage, targetsSearch);
        setTimeout(() => setCsvStatus('idle'), 3000);
      }).catch(() => {
        setCsvStatus('error');
        setError('failed to upload csv targets');
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const previewTargets = profile?.targets?.slice(0, 5) || [];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8 h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">

      <div>
        <h1 className="text-xl font-bold mb-2">settings</h1>
        <p className="text-sm text-text-secondary">your company profile determines what node0 scans for. we monitor for breaches that affect your target accounts through shared vendors, then generate outreach you can send to them.</p>
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

          {!showAllTargets ? (
            <>
              {previewTargets.length > 0 ? (
                <div className="flex flex-col gap-1 mb-3">
                  {previewTargets.map(target => (
                    <div key={target.id} className="flex items-center justify-between px-3 py-2 border border-border-default bg-bg-primary/50">
                      <div>
                        <span className="font-bold text-text-primary text-sm">{target.name}</span>
                        <span className="text-xs text-text-dim ml-2">{target.domain} · {target.industry}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditTarget(target)} className="p-1 text-text-dim hover:text-accent-cyan transition-colors"><Pencil size={12} /></button>
                        <button onClick={() => handleDeleteTarget(target.id)} className="p-1 text-text-dim hover:text-accent-red transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-text-dim mb-3 py-4 text-center">no targets yet — add them below or import a csv</div>
              )}
              {(profile?.targetCount || 0) > 5 && (
                <TerminalButton onClick={() => setShowAllTargets(true)} variant="ghost" className="mb-4 text-xs">
                  view all {profile?.targetCount} targets →
                </TerminalButton>
              )}
            </>
          ) : (
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-dim" />
                  <input
                    value={targetsSearch}
                    onChange={e => { setTargetsSearch(e.target.value); setTargetsPage(1); }}
                    placeholder="search targets..."
                    className="w-full bg-bg-primary border border-border-muted pl-7 p-2 text-xs text-text-primary outline-none focus:border-accent-cyan"
                  />
                </div>
                <TerminalButton onClick={() => setShowAllTargets(false)} variant="ghost" className="text-xs">
                  <X size={12} /> close
                </TerminalButton>
              </div>
              <div className="border border-border-default">
                <div className="flex text-[10px] text-text-dim border-b border-border-muted bg-bg-elevated px-3 py-2">
                  <div className="flex-1">company</div>
                  <div className="w-36">domain</div>
                  <div className="w-24">industry</div>
                  <div className="w-20">source</div>
                  <div className="w-14" />
                </div>
                {targetsData.targets.length === 0 ? (
                  <div className="text-xs text-text-dim py-4 text-center">no targets found</div>
                ) : (
                  targetsData.targets.map(target => (
                    <div key={target.id} className="flex items-center px-3 py-2 border-b border-border-muted last:border-b-0 text-xs">
                      <div className="flex-1 text-text-primary font-bold truncate">{target.name}</div>
                      <div className="w-36 text-text-dim truncate">{target.domain}</div>
                      <div className="w-24 text-text-dim truncate">{target.industry}</div>
                      <div className="w-20 text-text-dim">{target.source}</div>
                      <div className="w-14 flex items-center gap-1">
                        <button onClick={() => handleEditTarget(target)} className="p-0.5 text-text-dim hover:text-accent-cyan transition-colors"><Pencil size={11} /></button>
                        <button onClick={() => handleDeleteTarget(target.id)} className="p-0.5 text-text-dim hover:text-accent-red transition-colors"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {targetsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-2 text-xs text-text-dim">
                  <span>{targetsData.pagination.total} total</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTargetsPage(p => Math.max(1, p - 1))}
                      disabled={targetsPage === 1}
                      className="p-1 border border-border-muted hover:border-border-default disabled:opacity-30"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <span>{targetsPage} / {targetsData.pagination.totalPages}</span>
                    <button
                      onClick={() => setTargetsPage(p => Math.min(targetsData.pagination.totalPages, p + 1))}
                      disabled={targetsPage === targetsData.pagination.totalPages}
                      className="p-1 border border-border-muted hover:border-border-default disabled:opacity-30"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {editingTarget && (
            <div className="border border-accent-cyan/30 bg-accent-cyan/5 p-4 mb-4">
              <div className="text-xs text-accent-cyan mb-2">edit target</div>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-text-secondary block mb-1">name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary outline-none focus:border-accent-cyan" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-text-secondary block mb-1">domain</label>
                  <input value={editDomain} onChange={e => setEditDomain(e.target.value)} className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary outline-none focus:border-accent-cyan" />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="text-xs text-text-secondary block mb-1">industry</label>
                  <input value={editIndustry} onChange={e => setEditIndustry(e.target.value)} className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary outline-none focus:border-accent-cyan" />
                </div>
                <TerminalButton onClick={handleSaveEdit} variant="primary">save</TerminalButton>
                <TerminalButton onClick={() => setEditingTarget(null)} variant="ghost">cancel</TerminalButton>
              </div>
            </div>
          )}

          <div className="border border-border-dashed p-4 mb-3">
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
