'use client';

import React from 'react';
import Link from 'next/link';
import { HeroScene } from '@/components/landing/hero-scene';
import { TerminalButton } from '@/components/ui/terminal-button';
import { motion } from 'motion/react';
import { Search, GitBranch, Send, Shield, Globe, Database, Eye, Cpu, Server } from 'lucide-react';

const STEPS = [
  {
    icon: Search,
    title: 'detect',
    desc: 'real-time breach detection via bright data. continuously scanning security advisories, sec filings, and breach databases.',
  },
  {
    icon: GitBranch,
    title: 'trace',
    desc: 'map vendor networks outward from the origin. privacy policies, job postings, sec filings — every connection surfaces.',
  },
  {
    icon: Send,
    title: 'act',
    desc: 'identify your prospects in the blast zone. generate contextual outreach before anyone else knows they\'re exposed.',
  },
];

const PRODUCTS = [
  { name: 'mcp server', desc: 'connect ai agents to live web data', icon: Cpu },
  { name: 'web unlocker', desc: 'bypass bot detection and captchas', icon: Shield },
  { name: 'serp api', desc: 'real-time structured search results', icon: Search },
  { name: 'scraping browser', desc: 'automate js-heavy interactive sites', icon: Globe },
  { name: 'web scraper api', desc: 'structured json from 660+ sites', icon: Database },
  { name: 'proxies', desc: '400m+ ips for reliable at-scale access', icon: Server },
];

export default function LandingPage() {
  return (
    <div className="bg-bg-primary text-text-primary font-mono min-h-screen overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 border-b border-border-default bg-bg-primary/80 backdrop-blur-md">
        <Link href="/landing" className="text-lg font-bold tracking-wider">
          node<span className="text-accent-red">0</span>
        </Link>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/login" className="text-text-secondary hover:text-text-primary transition-colors">[login]</Link>
          <Link href="/signup" className="text-text-secondary hover:text-accent-cyan transition-colors">[signup]</Link>
        </div>
      </nav>

      <section className="relative h-screen flex flex-col items-center justify-center">
        <div className="absolute inset-0">
          <HeroScene />
        </div>

        <div className="relative z-10 pointer-events-none flex flex-col items-center">
          <div className="text-4xl md:text-5xl font-bold tracking-widest mb-3">
            node<span className="text-accent-red custom-pulse-red">0</span>
          </div>
          <div className="text-text-secondary text-sm tracking-wide">
            contact tracing for enterprise security
          </div>
        </div>

        <div className="absolute bottom-8 z-10 flex flex-col items-center gap-2 text-text-dim text-xs animate-bounce">
          <span>scroll</span>
          <span>↓</span>
        </div>
      </section>

      <section className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-xs text-text-dim uppercase tracking-widest mb-12"
        >
          //// how it works
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-bg-surface border border-border-default p-6"
            >
              <step.icon size={20} className="text-accent-cyan mb-4" />
              <div className="text-lg font-bold mb-2">{step.title}</div>
              <div className="text-sm text-text-secondary leading-relaxed">{step.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-xs text-text-dim uppercase tracking-widest mb-12"
        >
          //// infrastructure
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {PRODUCTS.map((product, i) => (
            <motion.div
              key={product.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="bg-bg-surface border border-border-default p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <product.icon size={14} className="text-text-secondary" />
                <span className="text-sm font-bold">{product.name}</span>
              </div>
              <div className="text-xs text-text-dim">{product.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="text-2xl font-bold">ready to trace?</div>
          <div className="flex items-center gap-4">
            <Link href="/">
              <TerminalButton variant="primary">launch dashboard</TerminalButton>
            </Link>
            <TerminalButton variant="default">view docs</TerminalButton>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-border-default py-8 px-6 text-center text-xs text-text-dim">
        // node0 © 2026 · built for the bright data x lablab hackathon
      </footer>
    </div>
  );
}
