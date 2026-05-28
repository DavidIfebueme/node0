'use client';

import React from 'react';
import { TerminalButton } from '@/components/ui/terminal-button';
import { CheckCircle, AlertCircle, Database, Shield, Zap } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8 h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
      
      <div>
        <h1 className="text-xl font-bold mb-2">Configurations</h1>
        <p className="text-sm text-text-secondary">Manage integrations, sources, and node0 behavior.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
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

        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Shield size={14} /> //// monitored sources
          </div>
          
          <div className="flex flex-col gap-3">
            {[
              { id: 'src-1', label: 'Breach Databases (HaveIBeenPwned, etc.)', active: true },
              { id: 'src-2', label: 'SEC Filings & Disclosures', active: true },
              { id: 'src-3', label: 'Dark Web & Hacker Forums', active: false },
              { id: 'src-4', label: 'News Integrations', active: true },
            ].map(src => (
              <div key={src.id} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{src.label}</span>
                <button 
                  className={`w-10 h-5 border flex items-center transition-all ${src.active ? 'border-accent-cyan bg-accent-cyan/10' : 'border-border-muted bg-bg-primary'}`}
                >
                  <div className={`w-3.5 h-3.5 mx-0.5 bg-current transition-transform duration-200 ${src.active ? 'translate-x-5 text-accent-cyan' : 'translate-x-0 text-text-dim'}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-bg-surface border border-border-default p-5">
          <div className="flex items-center gap-2 text-xs text-text-dim mb-4 border-b border-border-muted pb-2">
            <Zap size={14} /> //// prospect crm sync
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="border border-border-dashed p-4 flex flex-col items-center justify-center text-center gap-2">
              <AlertCircle size={20} className="text-text-secondary" />
              <div className="text-sm text-text-primary">Salesforce Disconnected</div>
              <div className="text-xs text-text-secondary">Connect your CRM to auto-match breached vendors with your prospect lists.</div>
            </div>
            <TerminalButton variant="primary" className="w-full">
              connect salesforce
            </TerminalButton>
          </div>
        </section>
        
      </div>
    </div>
  );
}
