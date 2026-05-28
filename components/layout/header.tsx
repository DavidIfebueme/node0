'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { GlitchText } from '@/components/ui/glitch-text';

export function Header() {
  const pathname = usePathname();
  
  const getNavPath = () => {
    if (pathname === '/') return 'radar';
    if (pathname.startsWith('/map')) return 'map / trace';
    if (pathname === '/actions') return 'actions';
    if (pathname === '/settings') return 'settings';
    return 'unknown';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border-default bg-bg-primary/80 backdrop-blur-md flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-bold tracking-wider text-text-primary flex items-center gap-1">
          node<span className="text-accent-red custom-pulse-red">0</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-sm text-text-secondary">
          <Link href="/" className={cn("hover:text-text-primary transition-colors", pathname === '/' && "text-accent-cyan")}>[ radar ]</Link>
          <span className="text-text-dim">↑</span>
          <Link href="/actions" className={cn("hover:text-text-primary transition-colors", pathname === '/actions' && "text-accent-cyan")}>[ actions ]</Link>
          <span className="text-text-dim">↑</span>
          <Link href="/settings" className={cn("hover:text-text-primary transition-colors", pathname === '/settings' && "text-accent-cyan")}>[ settings ]</Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-xs text-text-secondary">
          <span className="w-2 h-2 rounded-full bg-accent-green" />
          <span>bright_data_connected</span>
        </div>
        <div className="w-6 h-6 border border-border-default rounded-full bg-bg-surface flex items-center justify-center">
          <span className="text-xs text-text-secondary">u</span>
        </div>
      </div>
    </header>
  );
}
