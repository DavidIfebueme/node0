'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TerminalButton } from '@/components/ui/terminal-button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('authentication failed. check credentials.');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-wider mb-2">
            node<span className="text-accent-red">0</span>
          </div>
          <div className="text-xs text-text-dim">// authenticate</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg-surface border border-border-default p-6 flex flex-col gap-4">
          {error && (
            <div className="text-accent-red text-xs font-mono bg-accent-red/5 border border-accent-red/20 p-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-text-secondary block mb-1">email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary font-mono outline-none focus:border-accent-cyan transition-colors"
              placeholder="operator@node0.io"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-bg-primary border border-border-muted p-2 text-sm text-text-primary font-mono outline-none focus:border-accent-cyan transition-colors"
            />
          </div>

          <TerminalButton type="submit" variant="primary" className="w-full mt-2" disabled={loading}>
            {loading ? 'authenticating...' : 'authenticate'}
          </TerminalButton>
        </form>

        <div className="mt-4 text-center text-xs text-text-dim">
          no account? <Link href="/signup" className="text-accent-cyan hover:underline">create one</Link>
        </div>

        <div className="mt-6 text-center text-[10px] text-text-dim font-mono">
          demo: demo@node0.io / node0demo
        </div>
      </div>
    </div>
  );
}
