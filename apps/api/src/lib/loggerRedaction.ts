// Logger Redaction & Secret Leakage Prevention (T158 / FR-036)
// Provides recursive payload redaction for structured logging. Applies both:
// 1. Key-based masking (password, secret, token, apiKey, authorization, bearer)
// 2. Pattern-based replacement for known credential formats & high-entropy tokens
// 3. Entropy heuristic fallback for long random substrings (length >=24, entropy >4.0 bits/char)
//
// Export: redactLogPayload(value: unknown): unknown
// Usage: Integrated via pino formatters.log in logging.ts

// Known secret-like regex patterns (global, will be applied repeatedly)
const PATTERNS: Array<{ name: string; regex: RegExp; replacer: (match: string) => string }> = [
  {
    name: "awsAccessKey",
    regex: /AKIA[0-9A-Z]{16}/g,
    replacer: () => "AKIA****************",
  },
  {
    name: "githubPat",
    regex: /ghp_[A-Za-z0-9]{36}/g,
    replacer: (m) => m.slice(0, 4) + "****", // ensure single underscore prefix preserved
  },
  {
    name: "neonKey",
    regex: /neon_[A-Za-z0-9]{32,}/g,
    replacer: (m) => m.split("_")[0] + "_****",
  },
  {
    name: "cloudflareToken",
    // Cloudflare API tokens are long base64-ish or hex strings (approx 40+ chars). Heuristic pattern.
    regex: /[A-Za-z0-9-_]{40,}/g,
    replacer: (m) => m.slice(0, 4) + "****" + m.slice(-4),
  },
  {
    name: "jwt",
    // Basic JWT detection: three base64url segments separated by dots
    regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    replacer: () => "jwt****redacted",
  },
  {
    name: "oauthAuthorizationCode",
    // OAuth authorization codes are typically 20-80 chars, alphanumeric + hyphens/underscores
    // Pattern: code parameter values (avoid over-matching)
    regex: /(?:code=|"code":\s*")[A-Za-z0-9_-]{20,80}(?:"|&)/g,
    replacer: (m) => m.slice(0, 10) + "****" + m.slice(-5),
  },
  {
    name: "refreshToken",
    // Refresh tokens are typically high-entropy strings, often prefixed or in specific fields
    // This is a conservative pattern; key-based redaction (below) is primary defense
    regex: /(?:refresh_token=|"refreshToken":\s*")[A-Za-z0-9_-]{32,}(?:"|&)/g,
    replacer: (m) => m.slice(0, 20) + "****",
  },
];

// Keys that trigger full masking of their values
const SENSITIVE_KEYS = new Set([
  "password",
  "pass",
  "secret",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey", // normalized lowercase
  "authorization",
  "auth",
  "bearer",
  "privatekey",
  "clientsecret",
  "code", // OAuth authorization code
  "codeverifier", // PKCE code verifier
  "state", // OAuth state parameter
]);

// Shannon entropy approximation
function shannonEntropy(str: string): number {
  if (!str) return 0;
  const freq: Record<string, number> = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  const len = str.length;
  let entropy = 0;
  for (const k in freq) {
    const p = freq[k]! / len;
    entropy += -p * Math.log2(p);
  }
  return entropy; // bits per symbol total
}

// Decide if a substring should be masked via entropy heuristic
function looksHighEntropyToken(str: string): boolean {
  if (str.length < 24) return false;
  const unique = new Set(str.split(""));
  if (unique.size < Math.min(6, Math.ceil(str.length / 4))) return false;
  // Shannon entropy already returns bits/char; treat >=3.2 as sufficiently high
  const perChar = shannonEntropy(str);
  return perChar >= 3.2;
}

// Redact string by known patterns first, then entropy heuristic for residual long tokens
function redactString(value: string): string {
  let redacted = value;
  for (const p of PATTERNS) {
    redacted = redacted.replace(p.regex, (match) => p.replacer(match));
  }
  // Entropy heuristic: scan for candidate substrings (simple split by delimiters)
  const parts = redacted.split(/([\s"'`,;:\]\[\{\}\(\)])/); // keep delimiters
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part && looksHighEntropyToken(part)) {
      parts[i] = part.slice(0, 4) + "****" + part.slice(-4);
    }
  }
  return parts.join("");
}

// Recursive redaction
export function redactLogPayload(input: unknown): unknown {
  try {
    if (input == null) return input;
    if (typeof input === "string") return redactString(input);
    if (Array.isArray(input)) return input.map((v) => redactLogPayload(v));
    if (typeof input === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
        if (SENSITIVE_KEYS.has(k.toLowerCase())) {
          out[k] = "[REDACTED]";
          continue;
        }
        out[k] = redactLogPayload(v);
      }
      return out;
    }
    return input;
  } catch {
    // Fail closed: if redaction throws, return a safe placeholder
    return "[REDACTION_ERROR]";
  }
}

// Convenience wrapper for log objects
export function withRedaction<T extends Record<string, any>>(obj: T): T {
  return redactLogPayload(obj) as T;
}
