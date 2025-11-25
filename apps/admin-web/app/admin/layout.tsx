import React from 'react';
import '../globals.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <header className="border-b px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Flaresmith Admin</h1>
          <nav className="text-sm flex gap-4">
            <a href="/admin" className="hover:underline">Home</a>
            {/* Billing intentionally omitted (admin has no billing context) */}
            <a href="/admin/users" className="hover:underline">Users</a>
            <a href="/admin/settings" className="hover:underline">Settings</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
