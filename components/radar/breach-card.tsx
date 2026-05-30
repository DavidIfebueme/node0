'use client';

import React, { useState } from 'react';
import { Breach } from '@/lib/types';
import { format } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { X } from 'lucide-react';

const SEVERITY_SYMBOL: Record<string, { symbol: string; color: string }> = {
  CRITICAL: { symbol: '▲', color: 'text-accent-red' },
  HIGH: { symbol: '◆', color: 'text-accent-orange' },
  MEDIUM: { symbol: '●', color: 'text-yellow-400' },
  LOW: { symbol: '○', color: 'text-text-dim' },
};

export function BreachCard({ breach, index }: { breach: Breach; index: number }) {
  const router = useRouter();
  const removeBreach = useStore(s => s.removeBreach);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sev = SEVERITY_SYMBOL[breach.severity] || SEVERITY_SYMBOL.LOW;
  const dateValue = breach.detectedAt ? new Date(breach.detectedAt) : new Date();
  const isValidDate = !isNaN(dateValue.getTime());
  const timestamp = isValidDate ? format(dateValue, 'HH:mm:ss') : '--:--:--';
  const timeAgo = isValidDate ? formatDistanceToNow(dateValue) : 'just now';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    removeBreach(breach.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group cursor-pointer hover:bg-bg-elevated transition-colors duration-150 border-b border-border-muted px-4 py-3"
      onClick={() => router.push(`/map/${breach.id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-text-dim text-xs">[{timestamp}]</span>
            <span className={cn('text-xs', sev.color)}>{sev.symbol}</span>
            <span className="text-text-primary">{breach.companyName.toLowerCase().replace(/\s+/g, '_')}</span>
            <span className="text-text-dim text-xs">// {breach.breachType.toLowerCase()} // {breach.severity.toLowerCase()}</span>
          </div>
          <div className="text-text-secondary text-sm mt-0.5 truncate max-w-xl pl-[72px]">
            {breach.description.toLowerCase()}
          </div>
          <div className="flex items-center gap-2 text-text-dim text-xs mt-0.5 pl-[72px]">
            <span>──</span>
            <span>mapped {breach.mappedNodesCount} nodes</span>
            <span>──</span>
            <span>{timeAgo} ago</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 pt-1">
          <button
            onClick={handleDelete}
            className={`text-xs px-1.5 py-0.5 border transition-colors ${confirmDelete ? 'border-accent-red text-accent-red bg-accent-red/10' : 'border-transparent text-text-dim opacity-0 group-hover:opacity-100 hover:border-border-default hover:text-accent-red'}`}
            title={confirmDelete ? 'click again to confirm' : 'remove breach'}
          >
            <X size={12} />
          </button>
          <span className="text-accent-cyan text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            → trace
          </span>
        </div>
      </div>
    </motion.div>
  );
}
