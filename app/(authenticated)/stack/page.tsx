'use client';

import React from 'react';

const stackLayers = [
  {
    label: 'data acquisition',
    items: [
      { name: 'bright data discover', desc: 'real-time breach and security incident discovery via web data engine', tag: 'BRIGHT_DATA' },
      { name: 'bright data web unlocker', desc: 'privacy policy and public document scraping for vendor mapping', tag: 'BRIGHT_DATA' },
      { name: 'bright data serp api', desc: 'google search with tbm=nws for targeted breach news queries', tag: 'BRIGHT_DATA' },
    ],
  },
  {
    label: 'ai & intelligence',
    items: [
      { name: 'glm-4.5-air — structured extraction', desc: 'extracts company names, breach types, severity, affected vendors from raw article text', tag: 'AIML_API' },
      { name: 'glm-4.5-air — outreach generation', desc: 'context-aware, tone-adjustable sales emails for cybersecurity vendors', tag: 'AIML_API' },
    ],
  },
  {
    label: 'persistence & auth',
    items: [
      { name: 'turso (libsql)', desc: 'edge-deployed sqlite — users, target accounts, hubspot tokens, saved outreach', tag: 'TURSO' },
      { name: 'next-auth v5', desc: 'jwt-based credentials auth with turso-backed user store', tag: 'NEXTAUTH' },
    ],
  },
  {
    label: 'frontend & viz',
    items: [
      { name: 'next.js 15', desc: 'app router, server components, api routes, sse streaming for scan progress', tag: 'NEXTJS' },
      { name: 'reactflow', desc: 'interactive vendor network graph — breach origins, vendor nodes, affected companies, prospect targets', tag: 'REACTFLOW' },
      { name: 'tailwind css v4', desc: 'terminal aesthetic — jetbrains mono, bracket nav, dark theme', tag: 'TAILWIND' },
    ],
  },
  {
    label: 'deployment',
    items: [
      { name: 'vercel', desc: 'serverless deployment with edge-optimized api routes', tag: 'VERCEL' },
      { name: 'hubspot crm', desc: 'oauth integration for contact sync and deal pipeline', tag: 'HUBSPOT' },
    ],
  },
];

const dataFlow = [
  { step: '01', label: 'discover', desc: 'bright data discovers breach incidents from across the web in real-time' },
  { step: '02', label: 'extract', desc: 'glm-4.5-air extracts structured breach data — company, type, severity, affected vendors' },
  { step: '03', label: 'map', desc: 'privacy policy scraping + ai extraction maps the vendor network around each breach' },
  { step: '04', label: 'trace', desc: 'blast radius analysis traces which target accounts share vendors with breached companies' },
  { step: '05', label: 'engage', desc: 'glm-4.5-air generates targeted outreach emails with breach-specific context' },
];

export default function StackPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] border-t border-border-default w-full p-4 md:p-8 max-w-7xl mx-auto overflow-y-auto hide-scrollbar">
      <div className="flex flex-col gap-2 border-b border-border-default pb-4 mb-6">
        <div className="text-xs text-text-dim">//// technology stack</div>
        <h1 className="text-xl font-bold text-text-primary tracking-wider">how node0 works</h1>
        <p className="text-xs text-text-secondary max-w-2xl">
          node0 combines real-time web data discovery with ai-powered extraction to give cybersecurity vendors
          actionable intelligence on breach blast radii affecting their target accounts.
        </p>
      </div>

      <div className="mb-8">
        <div className="px-4 py-2 border-b border-border-muted text-xs text-text-dim bg-bg-surface">
          //// pipeline — data flow
        </div>
        <div className="border border-border-default bg-bg-surface">
          {dataFlow.map((item, i) => (
            <div
              key={item.step}
              className={`flex items-start gap-4 px-4 py-3 ${i < dataFlow.length - 1 ? 'border-b border-border-muted' : ''}`}
            >
              <div className="flex flex-col items-center min-w-[2.5rem]">
                <span className="text-accent-cyan font-mono text-xs">{item.step}</span>
                <span className="text-text-dim text-[10px]">──→</span>
              </div>
              <div className="flex-1">
                <div className="text-text-primary text-sm font-bold">{item.label}</div>
                <div className="text-text-dim text-[11px] leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <div className="px-4 py-2 border-b border-border-muted text-xs text-text-dim bg-bg-surface">
          //// stack layers
        </div>
        <div className="border border-border-default bg-bg-surface">
          {stackLayers.map((layer, layerIdx) => (
            <div key={layer.label} className={layerIdx < stackLayers.length - 1 ? 'border-b border-border-muted' : ''}>
              <div className="px-4 py-2 border-b border-border-muted bg-accent-red/5">
                <span className="text-accent-red text-xs font-mono">[ {layer.label} ]</span>
              </div>
              {layer.items.map((item, itemIdx) => (
                <div
                  key={`${item.name}-${itemIdx}`}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${itemIdx < layer.items.length - 1 ? 'border-b border-border-muted' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary text-sm font-bold truncate">{item.name}</div>
                    <div className="text-text-dim text-[11px] leading-relaxed">{item.desc}</div>
                  </div>
                  <span className="text-[10px] text-accent-cyan bg-accent-cyan/5 border border-accent-cyan/20 px-1.5 py-0.5 whitespace-nowrap">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 border border-border-default bg-bg-surface">
        <div className="px-4 py-2 border-b border-border-muted">
          <span className="text-xs text-text-dim">//// partner prizes</span>
        </div>
        <div className="px-4 py-3 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="text-accent-cyan text-sm font-bold mb-1">bright data — web data unlocked</div>
            <div className="text-text-dim text-[11px]">$18,300 total prizes — technology application, presentation, business value, originality</div>
          </div>
          <div className="border-l border-border-muted hidden md:block" />
          <div className="flex-1">
            <div className="text-accent-cyan text-sm font-bold mb-1">ai/ml api partner</div>
            <div className="text-text-dim text-[11px]">$1,000 cash + $1,000 credits — glm-4.5-air for structured extraction and outreach generation</div>
          </div>
        </div>
      </div>
    </div>
  );
}
