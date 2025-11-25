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
      <head>
        <script dangerouslySetInnerHTML={{__html:`(function(){try{var t=localStorage.getItem('theme');if(t){document.documentElement.classList.add(t);}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`}} />
      </head>
      <body className='min-h-screen gradient-bg text-foreground'>
        <header className='border-b border-white/10 px-6 py-4 flex items-center justify-between bg-background/50 backdrop-blur-sm'>
          <Link href='/admin' className='flex items-center gap-2 font-bold'>
            <Logo className='h-8 w-8' />
            <span>Flaresmith Admin</span>
          </Link>
          <nav className='text-sm flex gap-6'>
            <Link href='/admin' className='hover:text-primary-300 transition-colors'>Home</Link>
            <Link href='/admin/users' className='hover:text-primary-300 transition-colors'>Users</Link>
            <Link href='/admin/settings' className='hover:text-primary-300 transition-colors'>Settings</Link>
            <Link href='/admin/analytics' className='hover:text-primary-300 transition-colors'>Analytics</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
