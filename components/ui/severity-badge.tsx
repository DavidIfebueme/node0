import React from 'react';
import { Severity } from '@/lib/types';
import { cn } from '@/lib/utils';

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const colors = {
    CRITICAL: "text-accent-red border-accent-red bg-accent-red/10",
    HIGH: "text-accent-orange border-accent-orange bg-accent-orange/10",
    MEDIUM: "text-yellow-400 border-yellow-400 bg-yellow-400/10",
    LOW: "text-text-secondary border-border-default bg-bg-surface",
  };

  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 border uppercase tracking-wider font-mono inline-block", colors[severity], className)}>
      [{severity}]
    </span>
  );
}
