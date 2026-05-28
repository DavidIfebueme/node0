'use client';

import React from 'react';
import { AmbientBackground } from '@/components/layout/ambient-background';
import { Header } from '@/components/layout/header';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AmbientBackground />
      <Header />
      <main className="pt-16 min-h-screen">
        {children}
      </main>
    </>
  );
}
