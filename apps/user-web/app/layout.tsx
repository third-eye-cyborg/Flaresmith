import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flaresmith - User Portal',
  description: 'Manage your projects and environments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900">
        <header className="border-b px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Flaresmith</h1>
          <nav className="text-sm flex gap-4">
            <a href="/" className="hover:underline">Home</a>
            {/* Placeholder billing link per T010 */}
            <a href="/billing" className="hover:underline text-indigo-600">Billing</a>
            <a href="/login" className="hover:underline">Login</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
