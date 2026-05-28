'use client';

import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface GlitchTextProps {
  children: React.ReactNode;
  trigger?: number | boolean;
  className?: string;
  as?: any;
}

export function GlitchText({ children, trigger, className, as: Component = 'span' }: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    setIsGlitching(true);
    const timer = setTimeout(() => setIsGlitching(false), 300);
    return () => clearTimeout(timer);
  }, [trigger, children]);

  return (
    <Component className={cn(className, isGlitching && 'animate-glitch', 'relative inline-block')}>
      {children}
    </Component>
  );
}
