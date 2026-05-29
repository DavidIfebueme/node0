'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TerminalButton } from '@/components/ui/terminal-button';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, company }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'initialization failed.');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('account created but login failed. try signing in manually.');
      } else {
        router.push('/dashboard');
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

        <form onSubmit={handleSubmit} className="bg-bg-surface border border-border-default p-6 flex flex-col gap-4">
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
              className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary font-mono outline-none focus:border-accent-cyan transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary font-mono outline-none focus:border-accent-cyan transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">company <span className="text-text-dim">(optional)</span></label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
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
