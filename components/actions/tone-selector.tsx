import React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'professional' | 'urgent' | 'casual';

interface ToneSelectorProps {
  tone: Tone;
  onChange: (tone: Tone) => void;
}

const TONES: Tone[] = ['professional', 'urgent', 'casual'];

export function ToneSelector({ tone, onChange }: ToneSelectorProps) {
  return (
    <div className="flex gap-1 bg-bg-surface p-1 border border-border-muted text-xs">
      {TONES.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            'flex-1 py-1.5 text-center transition-colors',
            tone === t
              ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          [{t}]
        </button>
      ))}
    </div>
  );
}
