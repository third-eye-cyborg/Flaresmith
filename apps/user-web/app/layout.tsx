import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Logo } from '../src/components/Logo';

export const metadata: Metadata = {
  title: 'Flaresmith - User Portal',
  description: 'Manage your projects and environments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className='dark'>
      <body className='min-h-screen bg-background text-foreground'>
        <header className='border-b border-border bg-card/50 backdrop-blur-sm'>
          <div className='max-w-7xl mx-auto px-6 py-4 flex items-center justify-between'>
            <Link href='/' className='flex items-center gap-3 font-bold text-lg hover:opacity-80 transition-opacity'>
              <Logo className='h-8 w-auto' />
              <span>Flaresmith</span>
            </Link>
            <nav className='flex gap-8 text-sm font-medium'>
              <Link href='/projects' className='text-muted-foreground hover:text-foreground transition-colors'>Projects</Link>
              <Link href='/environments' className='text-muted-foreground hover:text-foreground transition-colors'>Environments</Link>
              <Link href='/billing' className='text-muted-foreground hover:text-foreground transition-colors'>Billing</Link>
              <Link href='/login' className='text-muted-foreground hover:text-foreground transition-colors'>Login</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
