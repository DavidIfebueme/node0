'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TerminalButton } from '@/components/ui/terminal-button';
import { Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('name is required'); return; }
    if (name.trim().length < 2) { setError('name must be at least 2 characters'); return; }
    if (!email.trim()) { setError('email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('invalid email format'); return; }
    if (!password) { setError('password is required'); return; }
    if (password.length < 6) { setError('password must be at least 6 characters'); return; }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim(), company: company.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'initialization failed.');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('account created but login failed. try logging in manually.');
        setTimeout(() => window.location.href = '/login', 1500);
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError('initialization failed. try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-wider mb-2">
            node<span className="text-accent-red">0</span>
          </div>
          <div className="text-xs text-text-dim">// initialize</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg-surface border border-border-default p-6 flex flex-col gap-4" noValidate>
          {error && (
            <div className="text-accent-red text-xs font-mono bg-accent-red/5 border border-accent-red/20 p-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-text-secondary block mb-1">name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
              className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary font-mono outline-none focus:border-accent-cyan transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary font-mono outline-none focus:border-accent-cyan transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full bg-bg-primary border border-border-muted p-2 pr-9 text-sm text-text-primary font-mono outline-none focus:border-accent-cyan transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="text-[10px] text-text-dim mt-1">minimum 6 characters</div>
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">company <span className="text-text-dim">(optional)</span></label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
              className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary font-mono outline-none focus:border-accent-cyan transition-colors"
            />
          </div>

          <TerminalButton type="submit" variant="primary" className="w-full mt-2" disabled={loading}>
            {loading ? 'initializing...' : 'initialize node0'}
          </TerminalButton>
        </form>

        <div className="mt-4 text-center text-xs text-text-dim">
          already have an account? <Link href="/login" className="text-accent-cyan hover:underline">sign in</Link>
        </div>
      </div>
    </div>
  );
}
