"use client";
import { useState, useEffect } from 'react';

// Placeholder imports - adjust paths to actual shared primitives if different
// Local lightweight demo primitives to avoid type resolution issues in showcase build
const DemoButton: React.FC<{ label: string; tone?: 'primary' | 'secondary' | 'destructive'; disabled?: boolean }> = ({ label, tone = 'primary', disabled }) => {
  const toneClass: Record<string,string> = {
    primary: 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]',
    secondary: 'bg-[var(--action-secondary-bg)] text-[var(--action-secondary-fg)]',
    destructive: 'bg-[var(--action-destructive-bg)] text-[var(--action-destructive-fg)]'
  };
  return <button disabled={disabled} className={`rounded-md px-4 py-2 text-sm font-medium shadow ${toneClass[tone]} disabled:opacity-50`}>{label}</button>;
};

const DemoCard: React.FC<{ variant: string; children: React.ReactNode }> = ({ variant, children }) => {
  const base = 'rounded-lg p-5 shadow-sm backdrop-blur-sm transition';
  const styles: Record<string,string> = {
    elevated: 'bg-[var(--surface-elevated-bg)] shadow-[var(--elevation-md)]',
    glass: 'bg-[var(--glass-bg)]/60 border border-[var(--glass-border)] shadow-[var(--elevation-sm)]',
    flat: 'bg-[var(--surface-flat-bg)] border border-[var(--border-muted)]'
  };
  return <div className={`${base} ${styles[variant]}`}>{children}</div>;
};

const DemoBadge: React.FC<{ variant: string; children: React.ReactNode }> = ({ variant, children }) => {
  const styles: Record<string,string> = {
    default: 'bg-[var(--accent-bg)] text-[var(--accent-fg)]',
    outline: 'border border-[var(--accent-bg)] text-[var(--accent-bg)]',
    subtle: 'bg-[var(--accent-bg)]/15 text-[var(--accent-bg)]'
  };
  return <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${styles[variant]}`}>{children}</span>;
};

// Simple variant registry for demo
const cardVariants = ['elevated','glass','flat'] as const;
const badgeVariants = ['default','outline','subtle'] as const;

export default function ShowcasePage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [cardVariant, setCardVariant] = useState<(typeof cardVariants)[number]>('elevated');
  const [badgeVariant, setBadgeVariant] = useState<(typeof badgeVariants)[number]>('default');
  const [previewEnabled, setPreviewEnabled] = useState(false);

  function toggleTheme() {
    const start = performance.now();
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    // apply class strategy
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    requestAnimationFrame(() => {
      const latency = performance.now() - start;
      // capture for telemetry aggregation
      (window as any).__themeLatencyStats = (window as any).__themeLatencyStats || { web: [] };
      (window as any).__themeLatencyStats.web.push(latency);
      // eslint-disable-next-line no-console
      console.log(`[showcase-theme-switch] mode=${next} latencyMs=${latency}`);
    });
  }

  // ensure initial class matches state
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="min-h-screen p-6 space-y-8 bg-background text-foreground">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Design System Showcase</h1>
        <div className="flex gap-3">
          <button onClick={toggleTheme} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm shadow">
            Toggle Theme (Current: {theme})
          </button>
          <button
            onClick={() => setPreviewEnabled(p => !p)}
            className="px-3 py-2 rounded-md bg-accent text-accent-foreground text-sm shadow"
          >
            {previewEnabled ? 'Disable Preview Layer' : 'Enable Preview Layer'}
          </button>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <DemoButton label="Primary" />
          <DemoButton label="Secondary" tone="secondary" />
          <DemoButton label="Destructive" tone="destructive" />
          <DemoButton label="Disabled" disabled />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Card Variants</h2>
          <div className="flex gap-2">
            {cardVariants.map(v => (
              <button
                key={v}
                onClick={() => setCardVariant(v)}
                className={`px-2 py-1 rounded text-sm border ${cardVariant===v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >{v}</button>
            ))}
          </div>
        </div>
        <DemoCard variant={cardVariant}>
          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-semibold">{cardVariant.charAt(0).toUpperCase()+cardVariant.slice(1)} Card</h3>
            <p className="text-sm leading-relaxed">Demonstrates token-driven styling including elevation, glass / blur fallback, and semantic colors. Toggle variant buttons above to inspect transitions.</p>
          </div>
        </DemoCard>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Badge Variants</h2>
          <div className="flex gap-2">
            {badgeVariants.map(v => (
              <button
                key={v}
                onClick={() => setBadgeVariant(v)}
                className={`px-2 py-1 rounded text-sm border ${badgeVariant===v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >{v}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <DemoBadge variant={badgeVariant}>Badge {badgeVariant}</DemoBadge>
          <DemoBadge variant={badgeVariant}>Another Badge</DemoBadge>
          <DemoBadge variant={badgeVariant}>Status Pill</DemoBadge>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">Telemetry</h2>
        <p className="text-sm">Preview Layer: <strong>{previewEnabled ? 'ENABLED' : 'DISABLED'}</strong> (set DESIGN_PREVIEW=true before generation to reflect experimental tokens)</p>
        <p className="text-sm">Theme Switch Latencies Collected: {(window as any).__themeLatencyStats?.web?.length || 0}</p>
        <p className="text-xs text-muted-foreground">Use console logs `[showcase-theme-switch]` for detailed latency values. p95 can be computed manually from the collected array.</p>
      </section>
    </div>
  );
}
