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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:`(function(){document.documentElement.classList.add('dark');})();`}} />
      </head>
      <body className={`${inter.className} dark`}>
          <Providers>
            <nav className="w-full border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
              <div className="max-w-7xl mx-auto px-6 py-5 flex gap-8 items-center text-sm">
                <Link href="/" className="flex items-center gap-3 font-bold text-foreground text-base">
                  <Logo className="h-9 w-9" />
                  <span>Flaresmith</span>
                </Link>
                <Link href="/features" className="text-muted-foreground hover:text-primary transition-colors font-medium">Features</Link>
                <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors font-medium">Pricing</Link>
                <Link href="/projects" className="text-muted-foreground hover:text-primary transition-colors font-medium">Dashboard</Link>
                {designSyncFlagSnapshot.DESIGN_SYNC_ENABLED && (
                  <Link href="/design-sync" className="text-muted-foreground hover:text-foreground transition-colors">Design Sync</Link>
                )}
                <div className="ml-auto flex items-center gap-4">
                  <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors font-medium">Login</Link>
                  <Link href="/signup" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium">Sign Up</Link>
                </div>
              </div>
            </nav>
            {children}
            <Footer />
          </Providers>
      </body>
    </html>
  );
}
