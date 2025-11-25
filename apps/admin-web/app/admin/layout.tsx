import React from 'react';
import type { Metadata } from 'next';
import '../globals.css';
import Link from 'next/link';
import { Logo } from '../../src/components/Logo';

export const metadata: Metadata = {
  title: 'Flaresmith - Admin Portal',
  description: 'System administration and management',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className='dark'>
      <body className='min-h-screen bg-background text-foreground'>
        <header className='border-b border-border bg-card/50 backdrop-blur-sm'>
          <div className='max-w-7xl mx-auto px-6 py-4 flex items-center justify-between'>
            <Link href='/admin' className='flex items-center gap-3 font-bold text-lg hover:opacity-80 transition-opacity'>
              <Logo className='h-8 w-auto' />
              <span>Flaresmith Admin</span>
            </Link>
            <nav className='flex gap-8 text-sm font-medium'>
              <Link href='/admin' className='text-muted-foreground hover:text-foreground transition-colors'>Home</Link>
              <Link href='/admin/users' className='text-muted-foreground hover:text-foreground transition-colors'>Users</Link>
              <Link href='/admin/settings' className='text-muted-foreground hover:text-foreground transition-colors'>Settings</Link>
              <Link href='/admin/analytics' className='text-muted-foreground hover:text-foreground transition-colors'>Analytics</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
