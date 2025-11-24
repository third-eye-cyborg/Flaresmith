#!/usr/bin/env ts-node
/**
 * T049: verify-no-secrets CLI
 * Scans provided file globs for secret patterns, exits non-zero if found.
 */
import fs from 'fs';
import path from 'path';

const PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'AWS', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHubPAT', regex: /ghp_[A-Za-z0-9]{36}/ },
  { name: 'PrivateKey', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/ },
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files); else files.push(full);
  }
  return files;
}

function scan(file: string) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const findings = PATTERNS.flatMap(p => content.match(p.regex)?.map(v => ({ pattern: p.name, value: v })) || []);
    return findings.map(f => ({ file, ...f }));
  } catch { return []; }
}

async function run() {
  const target = process.argv[2] || process.cwd();
  const files = fs.statSync(target).isDirectory() ? walk(target) : [target];
  const results = files.flatMap(scan);
  if (results.length) {
    console.error('SECRET FINDINGS:\n' + results.map(r => `${r.file} -> ${r.pattern}`).join('\n'));
    process.exit(2);
  } else {
    console.log('No secrets detected.');
  }
}

run();
