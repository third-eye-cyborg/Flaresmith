import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import React from "react";
import Link from "next/link";
import { Footer } from "../src/components/Footer";
import { designSyncFlagSnapshot } from "../../api/src/config/flags";
import { Logo } from "../src/components/Logo";

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
      <head>
        <script dangerouslySetInnerHTML={{__html:`(function(){try{var t=localStorage.getItem('theme');if(t){document.documentElement.classList.add(t);}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`}} />
      </head>
      <body className={inter.className}>
          <Providers>
            <nav className="w-full border-b border-neutral-800/40 bg-neutral-950/80 backdrop-blur-sm">
              <div className="max-w-7xl mx-auto px-6 py-3 flex gap-8 items-center text-sm text-neutral-300">
                <Link href="/" className="flex items-center gap-2 font-semibold text-neutral-100">
                  <Logo className="h-8 w-8" />
                  <span>Flaresmith</span>
                </Link>
                <Link href="/features" className="hover:text-neutral-100 transition-colors">Features</Link>
                <Link href="/pricing" className="hover:text-neutral-100 transition-colors">Pricing</Link>
                <Link href="/projects" className="hover:text-neutral-100 transition-colors">Dashboard</Link>
                {designSyncFlagSnapshot.DESIGN_SYNC_ENABLED && (
                  <Link href="/design-sync" className="hover:text-neutral-100 transition-colors ml-auto">Design Sync</Link>
                )}
              </div>
            </nav>
            {children}
            <Footer />
          </Providers>
      </body>
    </html>
  );
}
