#!/usr/bin/env tsx
/**
 * Bundle Size Analyzer (T109)
 * Measures web (.next/static) and mobile (apk/ipa placeholder) bundle sizes
 * and computes override impact relative to baseline.
 *
 * Usage:
 *   pnpm exec tsx scripts/design/analyzeBundleSize.ts --baseline <file> --current <file>
 *
 * Baseline/current files contain JSON:
 * { "webBytes": number, "mobileBytes": number }
 */
import { statSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface SizeSnapshot { webBytes: number; mobileBytes: number; }

function collectWebBundleSize(): number {
  const dir = join(process.cwd(), 'apps/web/.next/static');
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const file of readdirSync(dir)) {
    try { total += statSync(join(dir, file)).size; } catch {}
  }
  return total;
}

function collectMobileBundleSize(): number {
  // Placeholder: use compiled JS bundle (Expo) if present
  const dir = join(process.cwd(), 'apps/mobile/.expo');
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const file of readdirSync(dir)) {
    try { total += statSync(join(dir, file)).size; } catch {}
  }
  return total;
}

function loadSnapshot(path: string): SizeSnapshot | null {
  try { return JSON.parse(require('node:fs').readFileSync(path, 'utf-8')); } catch { return null; }
}

function pctChange(base: number, current: number): number {
  if (base === 0) return current === 0 ? 0 : 100;
  return ((current - base) / base) * 100;
}

async function main() {
  const args = process.argv.slice(2);
  const baselineArg = args.find(a => a.startsWith('--baseline='));
  const currentArg = args.find(a => a.startsWith('--current='));
  const outArg = args.find(a => a.startsWith('--out='));

  const baselinePath = baselineArg?.split('=')[1];
  const currentPath = currentArg?.split('=')[1];

  const baseline = baselinePath ? loadSnapshot(baselinePath) : null;
  const current = currentPath ? loadSnapshot(currentPath) : null;

  const liveWeb = collectWebBundleSize();
  const liveMobile = collectMobileBundleSize();

  const webBase = baseline?.webBytes ?? liveWeb;
  const mobileBase = baseline?.mobileBytes ?? liveMobile;

  const webCurrent = current?.webBytes ?? liveWeb;
  const mobileCurrent = current?.mobileBytes ?? liveMobile;

  const webPct = pctChange(webBase, webCurrent);
  const mobilePct = pctChange(mobileBase, mobileCurrent);

  const result = {
    web: { baseline: webBase, current: webCurrent, pctChange: Number(webPct.toFixed(2)), withinThreshold: webPct <= 10 },
    mobile: { baseline: mobileBase, current: mobileCurrent, pctChange: Number(mobilePct.toFixed(2)), withinThreshold: mobilePct <= 5 },
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(result, null, 2));
  if (outArg) {
    writeFileSync(outArg.split('=')[1]!, JSON.stringify(result, null, 2));
  }

  if (!result.web.withinThreshold) {
    console.warn('⚠️  Web bundle size increase exceeds 10% threshold (SC-009)');
  }
  if (!result.mobile.withinThreshold) {
    console.warn('⚠️  Mobile bundle size increase exceeds 5% threshold (SC-009)');
  }
}

main().catch(err => {
  console.error('Bundle size analysis failed', err);
  process.exit(1);
});
