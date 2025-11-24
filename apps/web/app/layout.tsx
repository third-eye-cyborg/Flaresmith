import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "next-themes";
import React from "react";
import ThemeToggle from "./theme-toggle";
import Link from "next/link";
import { designSyncFlagSnapshot } from "../../api/src/config/flags";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flaresmith - Multi-Environment Orchestration Platform",
  description: "Spec-first orchestration for GitHub, Cloudflare, Neon, and Postman",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Providers>
            <div className="fixed top-2 right-2 z-50">
              <ThemeToggle />
            </div>
            <nav className="w-full border-b border-neutral-200 dark:border-neutral-700 mb-4 bg-neutral-50 dark:bg-neutral-900">
              <div className="max-w-7xl mx-auto px-4 py-2 flex gap-6 items-center text-sm">
                <Link href="/" className="font-semibold">Dashboard</Link>
                {designSyncFlagSnapshot.DESIGN_SYNC_ENABLED && (
                  <Link href="/design-sync" className="hover:underline">Design Sync</Link>
                )}
              </div>
            </nav>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
