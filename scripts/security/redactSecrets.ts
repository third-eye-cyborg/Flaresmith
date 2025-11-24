#!/usr/bin/env ts-node
/**
 * T048: Redaction utility
 * Provides deterministic masking for known secret patterns.
 */

const PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "AWS", regex: /AKIA[0-9A-Z]{16}/g },
  { name: "GitHubPAT", regex: /ghp_[A-Za-z0-9]{36}/g },
  { name: "GenericKey", regex: /(?<![A-Za-z0-9])[A-Za-z0-9]{32}(?![A-Za-z0-9])/g }
];

export function redact(input: string): string {
  let out = input;
  for (const p of PATTERNS) {
    out = out.replace(p.regex, m => `${p.name}_REDACTED(${m.slice(0,4)}…${m.slice(-4)})`);
  }
  return out;
}

if (require.main === module) {
  const data = process.stdin.isTTY ? process.argv.slice(2).join(" ") : require("fs").readFileSync(0, "utf8");
  process.stdout.write(redact(data));
}
