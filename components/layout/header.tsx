'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { href: '/dashboard', label: '[ radar ]', active: pathname === '/dashboard' },
    { href: '/actions', label: '[ actions ]', active: pathname === '/actions' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border-default bg-bg-primary/80 backdrop-blur-md flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-xl font-bold tracking-wider text-text-primary flex items-center gap-1">
          node<span className="text-accent-red custom-pulse-red">0</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-sm text-text-secondary">
          {navLinks.map((link, i) => (
            <React.Fragment key={link.href}>
              {i > 0 && <span className="text-text-dim">↑</span>}
              <Link href={link.href} className={cn("hover:text-text-primary transition-colors", link.active && "text-accent-cyan")}>{link.label}</Link>
            </React.Fragment>
          ))}
        </nav>
        <button
          className="md:hidden text-text-secondary hover:text-text-primary text-sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          [≡]
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-bg-surface border-b border-border-default md:hidden z-50">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn("block px-6 py-3 text-sm hover:bg-bg-elevated transition-colors", link.active && "text-accent-cyan")}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-6 py-3 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
          >
            [ settings ]
          </Link>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-6 h-6 border border-border-default rounded-full bg-bg-surface flex items-center justify-center hover:border-accent-cyan transition-colors"
          >
            <span className="text-xs text-text-secondary">
              {session?.user?.name?.[0]?.toLowerCase() || 'u'}
            </span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-bg-surface border border-border-default w-44 z-50">
              <div className="px-3 py-2 border-b border-border-muted text-xs text-text-dim truncate">
                {session?.user?.email || 'operator'}
              </div>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-xs text-text-secondary hover:bg-bg-elevated hover:text-accent-cyan transition-colors"
              >
                [ settings ]
              </Link>
              <button
                onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-bg-elevated hover:text-accent-red transition-colors"
              >
                [logout]
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
