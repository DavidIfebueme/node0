import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'node0 | Threat Mapping',
  description: 'AI agent detecting security breaches and mapping blast radius.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable}`}>
      <body className="bg-bg-primary text-text-primary font-mono antialiased selection:bg-accent-cyan selection:text-bg-primary overflow-x-hidden min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
