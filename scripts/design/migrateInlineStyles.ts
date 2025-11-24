#!/usr/bin/env ts-node
/**
 * Migration Script: Inline Style Literal Detection & Token Suggestion
 * Tasks: T094, T095
 * Scans apps/web and apps/mobile for inline style literals (#hex, spacing units, OKLCH) and
 * outputs a report with suggested token replacements using ESLint plugin logic heuristics.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = [
  'apps/web/src',
  'apps/mobile/src'
];
const STYLE_LITERAL_REGEX = /(#[0-9a-fA-F]{6,8}|oklch\([^\)]+\)|hsl\([^\)]+\)|\b\d+(px|rem|em)\b)/g;

interface Finding { file: string; line: number; literal: string; suggestion?: string; }

// Load token value map similar to ESLint plugin
async function loadTokenMap(): Promise<Map<string,string>> {
  const map = new Map<string,string>();
  try {
    const genPath = path.join(ROOT, 'packages/config/tailwind/tokens.generated.ts');
    const basePath = path.join(ROOT, 'packages/config/tailwind/tokens.base.json');
    if (await exists(genPath)) {
      const content = await readFile(genPath, 'utf-8');
      const regex = /(primary|accent|semantic|glass|elevation|spacing|radius|typography)\.[^:'\"\s]+['"\s]*:[\s]*['\"]([^'\"]+)['\"]/g;
      let m: RegExpExecArray | null; 
      while ((m = regex.exec(content))) { 
        const category = m[1];
        const value = m[2];
        if (value && category && !map.has(value)) map.set(value, category);
      }
    } else if (await exists(basePath)) {
      const json = JSON.parse(await readFile(basePath, 'utf-8'));
      Object.entries(json).forEach(([name,value]) => { if (typeof value === 'string' && !map.has(value)) map.set(value as string, name); });
    }
  } catch {}
  return map;
}

async function exists(p: string) { try { await readFile(p); return true; } catch { return false; } }

async function scanDir(dir: string, tokenMap: Map<string,string>, findings: Finding[]) {
  const abs = path.join(ROOT, dir);
  let entries: any[] = [];
  try {
    entries = await readdir(abs, { withFileTypes: true });
  } catch { return; }
  for (const entry of entries) {
    const full = path.join(abs, entry.name);
    if (entry.isDirectory()) { await scanDir(path.join(dir, entry.name), tokenMap, findings); continue; }
    if (!/\.(tsx|ts|jsx|js)$/.test(entry.name)) continue;
    const content = await readFile(full, 'utf-8');
    const lines = content.split(/\n/);
    lines.forEach((line, idx) => {
      const matches = line.match(STYLE_LITERAL_REGEX);
      if (!matches) return;
      for (const lit of matches) {
        const suggestion = tokenMap.get(lit);
        findings.push({ file: full, line: idx + 1, literal: lit, suggestion });
      }
    });
  }
}

async function main() {
  const tokenMap = await loadTokenMap();
  const findings: Finding[] = [];
  for (const dir of TARGET_DIRS) {
    await scanDir(dir, tokenMap, findings);
  }
  // Report
  console.log(`Inline Style Migration Report`);
  console.log(`Total literals found: ${findings.length}`);
  const withSuggestions = findings.filter(f => f.suggestion);
  console.log(`Resolvable with token suggestions: ${withSuggestions.length}`);
  for (const f of findings) {
    const suggestion = f.suggestion ? `→ ${f.suggestion}` : '(no direct token)';
    console.log(`${f.file}:${f.line}  ${f.literal}  ${suggestion}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
