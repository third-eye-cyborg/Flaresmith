#!/usr/bin/env tsx
/**
 * Simple Token Generation (Fallback)
 * Generates `packages/config/tailwind/tokens.generated.ts` from `tokens.base.json` without DB access.
 * Adds timestamp line used by propagation tracking (SC-002) and computes a SHA-256 hash of the token payload.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

function main() {
  const basePath = join(process.cwd(), 'packages/config/tailwind/tokens.base.json');
  const outPath = join(process.cwd(), 'packages/config/tailwind/tokens.generated.ts');
  const raw = readFileSync(basePath, 'utf-8');
  const json = JSON.parse(raw);
  const tokens = json.tokens;

  const designTokens = {
    colors: tokens.color,
    spacing: tokens.spacing,
    typography: tokens.typography,
    borderRadius: tokens.radius,
    elevation: tokens.elevation,
    glass: tokens.glass,
    semantic: tokens.semantic,
  };
  const stable = JSON.stringify(designTokens);
  const tokenHash = createHash('sha256').update(stable, 'utf8').digest('hex');
  const tokenVersion = json.version || 1;
  const timestamp = new Date().toISOString();

  const file = `// Generated at: ${timestamp}\n// Version: ${tokenVersion}\n// Hash: ${tokenHash}\nexport const designTokens = ${stable};\nexport const tokenVersion = ${tokenVersion};\nexport const tokenHash = '${tokenHash}';\n`;
  writeFileSync(outPath, file, 'utf-8');
  console.log(`✅ tokens.generated.ts written (version=${tokenVersion} hash=${tokenHash.slice(0,8)}...)`);
}

main();
