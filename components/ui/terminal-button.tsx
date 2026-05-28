import React from 'react';
import { cn } from '@/lib/utils';

interface TerminalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost';
  children: React.ReactNode;
}

export function TerminalButton({ variant = 'default', className, children, ...props }: TerminalButtonProps) {
  const baseClasses = "font-mono text-sm px-4 py-2 transition-all duration-150 active:scale-[0.98] outline-none flex items-center justify-center gap-2";
  
  const variants = {
    default: "border border-border-default text-text-primary hover:border-accent-cyan hover:text-accent-cyan bg-bg-surface/50 hover:bg-bg-elevated",
    primary: "border border-accent-cyan bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan hover:text-bg-primary",
    ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-elevated transparent",
  };

  return (
    <button className={cn(baseClasses, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
