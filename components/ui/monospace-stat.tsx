'use client';
import React, { useEffect, useState } from 'react';
import { GlitchText } from './glitch-text';

export function MonospaceStat({ label, value }: { label: string; value: string | number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (value !== displayValue) {
      setDisplayValue(value);
      setTrigger(prev => prev + 1);
    }
  }, [value, displayValue]);

  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      <span className="text-text-secondary">{label}:</span>
      <GlitchText trigger={trigger} className="text-text-primary">
        {displayValue}
      </GlitchText>
    </div>
  );
}
