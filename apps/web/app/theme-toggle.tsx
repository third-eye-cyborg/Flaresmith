"use client";
import React, { useCallback, useState } from 'react';
import { useTheme } from 'next-themes';

// Simple latency tracker using performance marks
function recordLatency(start: number, mode: string) {
  const delta = performance.now() - start;
  // eslint-disable-next-line no-console
  console.log(`[theme-switch] mode=${mode} latencyMs=${delta.toFixed(2)}`);
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isSwitching, setIsSwitching] = useState(false);

  const toggle = useCallback(() => {
    const start = performance.now();
    setIsSwitching(true);
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    // Allow paint then record
    requestAnimationFrame(() => {
      recordLatency(start, next);
      setIsSwitching(false);
    });
  }, [theme, setTheme]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="px-3 py-2 rounded-md text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 shadow-md hover:opacity-90 transition"
      disabled={isSwitching}
    >
      {isSwitching ? '…' : theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
