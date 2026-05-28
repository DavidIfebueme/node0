'use client';

import React, { useState, useEffect } from 'react';
import { getProfile } from '@/lib/api';
import { TerminalButton } from '@/components/ui/terminal-button';
import { CheckCircle, Database, Shield, Zap, Target, Building2 } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ companyName: string; industry: string; targetCount: number; targets: Array<{ id: string; name: string; domain: string; industry: string }> } | null>(null);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetDomain, setNewTargetDomain] = useState('');
  const [newTargetIndustry, setNewTargetIndustry] = useState('');

  useEffect(() => {
    getProfile().then(setProfile).catch(console.error);
  }, []);

  const handleAddTarget = () => {
    if (!newTargetName || !newTargetDomain || !profile) return;
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

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8 h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
      
      <div>
        <h1 className="text-xl font-bold mb-2">Configurations</h1>
        <p className="text-sm text-text-secondary">Your company profile determines what node0 scans for.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Building2 size={14} /> //// your company profile
          </div>
          
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">company name</label>
              <div className="bg-bg-primary border border-border-muted p-2 text-sm text-text-primary">
                {profile?.companyName || 'loading...'}
              </div>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">industry</label>
              <div className="bg-bg-primary border border-border-muted p-2 text-sm text-text-primary">
                {profile?.industry || 'loading...'}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-accent-green">
              <CheckCircle size={14} /> node0 scans for breaches affecting your targets
            </div>
          </div>
        </section>

        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Database size={14} /> //// bright data configuration
          </div>
          
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">API Key</label>
              <input 
                type="password" 
                value="••••••••••••••••••••••••"
                readOnly
                className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary outline-none focus:border-accent-cyan"
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-accent-green">
                <CheckCircle size={14} /> Connection active
              </div>
              <TerminalButton variant="ghost">test connection</TerminalButton>
            </div>
          </div>
        </section>

        <section className="bg-bg-surface border border-border-default p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-border-muted pb-2">
            <div className="flex items-center gap-2 text-xs text-text-dim">
              <Target size={14} /> //// target accounts ({profile?.targetCount || 0} companies)
            </div>
            <span className="text-xs text-text-dim">node0 cross-references breaches against these targets</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {profile?.targets.map(target => (
              <div key={target.id} className="p-3 border border-border-default bg-bg-primary/50 group">
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
        </section>

        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Shield size={14} /> //// monitored sources
          </div>
          
          <div className="flex flex-col gap-3">
            {[
              { id: 'src-1', label: 'Breach Databases (HaveIBeenPwned, etc.)', active: true },
              { id: 'src-2', label: 'SEC Filings & Disclosures', active: true },
              { id: 'src-3', label: 'Vendor Privacy Policies', active: true },
              { id: 'src-4', label: 'Job Postings & Tech Stack', active: true },
            ].map(src => (
              <div key={src.id} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{src.label}</span>
                <div className={`w-3 h-3 border ${src.active ? 'border-accent-cyan bg-accent-cyan/30' : 'border-border-muted bg-bg-primary'}`} />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Zap size={14} /> //// ai outreach engine
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>model:</span>
              <span className="text-text-primary">glm-4-plus</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>provider:</span>
              <span className="text-text-primary">zai</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-accent-green">
              <CheckCircle size={14} /> AI outreach generation active
            </div>
          </div>
        </section>
        
      </div>
    </div>
  );
}
