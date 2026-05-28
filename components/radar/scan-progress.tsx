'use client';

import React, { useEffect, useState } from 'react';
import { GlitchText } from '@/components/ui/glitch-text';

const STATUS_MESSAGES = [
  'parsing privacy policies...',
  'mapping vendor relationships...',
  'cross-referencing prospects...',
  'tracing blast radius...',
  'analyzing exposure vectors...',
  'scanning breach databases...',
  'identifying shared vendors...',
];

export function ScanProgress({ progress, isScanning }: { progress: number; isScanning: boolean }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (!isScanning) {
      setDisplayedText('');
      setCharIndex(0);
      return;
    }

    const msg = STATUS_MESSAGES[messageIndex];
    if (charIndex < msg.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(msg.slice(0, charIndex + 1));
        setCharIndex(prev => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setMessageIndex(prev => (prev + 1) % STATUS_MESSAGES.length);
        setCharIndex(0);
        setDisplayedText('');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isScanning, messageIndex, charIndex]);

  if (!isScanning) return null;

  return (
    <div className="flex flex-col gap-2 flex-1 md:w-64">
      <div className="flex items-center gap-4 font-mono text-xs text-accent-cyan">
        <GlitchText className="min-w-[80px]">scanning...</GlitchText>
        <div className="flex-1 h-1 bg-border-default relative overflow-hidden">
          <div
            className="absolute top-0 left-0 bottom-0 bg-accent-cyan transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span>{Math.min(progress, 100)}%</span>
      </div>
      <div className="text-[10px] text-text-dim font-mono h-4">
        {displayedText}<span className="animate-pulse">█</span>
      </div>
    </div>
  );
}
