#!/usr/bin/env tsx
/**
 * Token Propagation Tracking (T111)
 * Measures time from commit timestamp (from git) to token generation completion.
 * Intended for CI usage after tokens regenerate.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function getLatestCommitTime(): number {
  const iso = execSync('git log -1 --format=%cI').toString().trim();
  return new Date(iso).getTime();
}

function getGenerationTimestamp(): number {
  const genPath = join(process.cwd(), 'packages/config/tailwind/tokens.generated.ts');
  try {
    const content = readFileSync(genPath, 'utf-8');
    const match = content.match(/Generated at: (.*)/);
    if (match) return new Date(match[1]!).getTime();
  } catch {}
  return Date.now();
}

function main() {
  const commitTs = getLatestCommitTime();
  const genTs = getGenerationTimestamp();
  const propagationMs = genTs - commitTs;
  console.log(JSON.stringify({ commitTs, genTs, propagationMs, withinTarget: propagationMs <= 5 * 60 * 1000 }, null, 2));
  if (propagationMs > 5 * 60 * 1000) {
    console.warn('⚠️  Token propagation exceeds 5 minute SC-002 target');
  }
}

main();
