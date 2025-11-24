import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "next-themes";
import React from "react";
import ThemeToggle from "./theme-toggle";

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
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
