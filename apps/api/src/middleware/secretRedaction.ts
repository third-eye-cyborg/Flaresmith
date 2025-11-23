import type { Context, Next } from "hono";

/**
 * T010: Secret redaction middleware with regex patterns for API keys, tokens, connection strings
 * Source: specs/002-github-secrets-sync/research.md (D-012)
 * 
 * Scans log objects for known secret patterns before emission and replaces with ***REDACTED***
 */

// Secret redaction patterns
const SECRET_PATTERNS = [
  // GitHub tokens
  { pattern: /ghp_[A-Za-z0-9]{36,}/g, name: "GitHub Personal Access Token" },
  { pattern: /ghs_[A-Za-z0-9]{36,}/g, name: "GitHub OAuth Access Token" },
  { pattern: /github_pat_[A-Za-z0-9_]{82}/g, name: "GitHub Fine-grained PAT" },
  
  // API keys (generic heuristic)
  { pattern: /[A-Za-z0-9_-]{20,}/g, name: "Potential API Key" },
  
  // Connection strings
  { pattern: /postgres:\/\/[^:]+:[^@]+@[^\s]+/g, name: "PostgreSQL Connection String" },
  { pattern: /mysql:\/\/[^:]+:[^@]+@[^\s]+/g, name: "MySQL Connection String" },
  { pattern: /mongodb:\/\/[^:]+:[^@]+@[^\s]+/g, name: "MongoDB Connection String" },
  
  // JWT tokens
  { pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, name: "JWT Token" },
  
  // Cloudflare tokens
  { pattern: /CF_[A-Za-z0-9_-]{40,}/g, name: "Cloudflare API Token" },
  
  // AWS credentials
  { pattern: /AKIA[0-9A-Z]{16}/g, name: "AWS Access Key" },
  { pattern: /aws_secret_access_key\s*=\s*[^\s]+/g, name: "AWS Secret Key" },
  
  // Private keys
  { pattern: /-----BEGIN\s+(?:RSA|EC|OPENSSH)\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA|EC|OPENSSH)\s+PRIVATE\s+KEY-----/g, name: "Private Key" },
];

// Known secret environment variable names
const SECRET_ENV_VARS = [
  "GITHUB_TOKEN",
  "GITHUB_PAT",
  "DATABASE_URL",
  "NEON_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "POSTMAN_API_KEY",
  "BETTERAUTH_SECRET",
  "MASTER_ENC_KEY",
  "JWT_SECRET",
  "API_KEY",
  "API_SECRET",
  "SECRET_KEY",
  "PRIVATE_KEY",
  "PASSWORD",
];

/**
 * Redact sensitive values from any object
 */
export function redactSecrets(obj: any): any {
  if (typeof obj === "string") {
    return redactString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSecrets);
  }

  if (obj !== null && typeof obj === "object") {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key name indicates a secret
      const isSecretKey = SECRET_ENV_VARS.some(
        (secretVar) => key.toUpperCase().includes(secretVar)
      );

      if (isSecretKey && typeof value === "string") {
        redacted[key] = "***REDACTED***";
      } else {
        redacted[key] = redactSecrets(value);
      }
    }
    return redacted;
  }

  return obj;
}

/**
 * Redact secrets from a string using regex patterns
 */
function redactString(str: string): string {
  let redacted = str;

  for (const { pattern } of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, "***REDACTED***");
  }

  return redacted;
}

/**
 * Hono middleware for secret redaction in logs
 */
export async function secretRedactionMiddleware(_c: Context, next: Next) {
  // Store original console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  try {
    // Override console methods to redact secrets
    console.log = (...args: any[]) => {
      originalLog(...args.map(redactSecrets));
    };

    console.error = (...args: any[]) => {
      originalError(...args.map(redactSecrets));
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args.map(redactSecrets));
    };

    console.info = (...args: any[]) => {
      originalInfo(...args.map(redactSecrets));
    };

    await next();
  } finally {
    // Restore original console methods
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.info = originalInfo;
  }
}
