/**
 * Redaction utility (library layer) - T048
 * Exposes redact() for runtime secret masking prior to logging.
 */

const PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'AWS', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHubPAT', regex: /ghp_[A-Za-z0-9]{36}/g },
  { name: 'StripeKey', regex: /sk_live_[A-Za-z0-9]{24,}/g },
  { name: 'Generic32', regex: /(?<![A-Za-z0-9])[A-Za-z0-9]{32}(?![A-Za-z0-9])/g }
];

export function redact(input: string): string {
  let out = input;
  for (const p of PATTERNS) {
    out = out.replace(p.regex, m => `${p.name}_REDACTED(${m.slice(0,4)}…${m.slice(-4)})`);
  }
  return out;
}

export function redactObject(obj: unknown): unknown {
  if (typeof obj === 'string') return redact(obj);
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (obj && typeof obj === 'object') {
    const clone: Record<string, any> = {};
    for (const [k,v] of Object.entries(obj as Record<string, any>)) clone[k] = redactObject(v);
    return clone;
  }
  return obj;
}
