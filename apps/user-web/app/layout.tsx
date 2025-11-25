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
      <head>
        <script dangerouslySetInnerHTML={{__html:`(function(){try{var t=localStorage.getItem('theme');if(t){document.documentElement.classList.add(t);}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`}} />
      </head>
      <body className='min-h-screen gradient-bg text-foreground'>
        <header className='border-b border-white/10 px-6 py-4 flex items-center justify-between bg-background/50 backdrop-blur-sm'>
          <Link href='/' className='flex items-center gap-2 font-bold'>
            <Logo className='h-8 w-8' />
            <span>Flaresmith</span>
          </Link>
          <nav className='text-sm flex gap-6'>
            <Link href='/projects' className='hover:text-primary-300 transition-colors'>Projects</Link>
            <Link href='/environments' className='hover:text-primary-300 transition-colors'>Environments</Link>
            <Link href='/billing' className='hover:text-primary-300 transition-colors'>Billing</Link>
            <Link href='/login' className='hover:text-primary-300 transition-colors'>Login</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
