'use client';

import React from 'react';
import { Breach } from '@/lib/types';
import { SeverityBadge } from '../ui/severity-badge';
import { TerminalButton } from '../ui/terminal-button';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';
import { ArrowRight, Network } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BreachCard({ breach, index }: { breach: Breach; index: number }) {
  const router = useRouter();
  
  const getSeverityStrip = (sev: string) => {
    switch(sev) {
      case 'CRITICAL': return 'bg-accent-red';
      case 'HIGH': return 'bg-accent-orange';
      case 'MEDIUM': return 'bg-yellow-400';
      case 'LOW': return 'bg-text-secondary';
      default: return 'bg-border-default';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group relative bg-bg-surface border border-border-default hover:border-accent-cyan/50 transition-colors duration-200 cursor-pointer overflow-hidden flex"
      onClick={() => router.push(`/map/${breach.id}`)}
    >
      <div className={cn("w-[3px] shrink-0", getSeverityStrip(breach.severity))} />
      
      <div className="flex-1 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-text-primary">{breach.companyName}</span>
            <SeverityBadge severity={breach.severity} />
            <span className="text-[10px] text-text-dim uppercase">[{breach.breachType}]</span>
          </div>
          <div className="text-sm text-text-secondary truncate max-w-xl">
            {breach.description}
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex flex-col items-end gap-1">
            <span className="text-text-dim text-xs">detected {formatDistanceToNow(new Date(breach.detectedAt))} ago</span>
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Network size={14} />
              <span>└─ {breach.mappedNodesCount} nodes mapped</span>
            </div>
          </div>
          <TerminalButton variant="ghost" className="opacity-0 group-hover:opacity-100 hidden md:flex">
            trace <ArrowRight size={14} />
          </TerminalButton>
        </div>
      </div>
    </motion.div>
  );
}
