import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
}

export function EmptyState({ message, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 relative">
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <div className="w-16 h-16 rounded-full border border-border-muted absolute" />
        <div className="w-32 h-32 rounded-full border border-border-muted absolute" />
        <div className="w-8 h-8 rounded-full border border-border-muted absolute translate-x-12 -translate-y-8" />
        <div className="w-6 h-6 rounded-full border border-border-muted absolute -translate-x-10 translate-y-10" />
      </div>
      {Icon && <Icon size={32} className="text-text-secondary mb-4" />}
      <p className="text-text-dim text-sm font-mono text-center">{message}</p>
    </div>
  );
}
