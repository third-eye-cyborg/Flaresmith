#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * T035: Secret Scanning Script
 * Detects secrets in source code before commit
 */

const SECRET_PATTERNS = [
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub Token", pattern: /ghp_[A-Za-z0-9]{36}/ },
  { name: "GitHub OAuth Token", pattern: /gho_[A-Za-z0-9]{36}/ },
  { name: "Slack Token", pattern: /xox[baprs]-([0-9a-zA-Z]{10,48})/ },
  { name: "Private Key", pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: "Generic API Key", pattern: /api[_-]?key['\"]?\s*[:=]\s*['\"]?[A-Za-z0-9]{32,}/ },
  { name: "JWT Token", pattern: /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+/ },
  // T118: Multi-MCP ecosystem token patterns
  { name: "Mapbox Access Token", pattern: /pk\.[A-Za-z0-9_-]{60,}/ },
  { name: "Mapbox Secret Token", pattern: /sk\.[A-Za-z0-9_-]{60,}/ },
  { name: "Polar API Key", pattern: /polar_[a-z]{2,4}_[A-Za-z0-9]{32,}/ },
  { name: "Expo Access Token", pattern: /[A-Za-z0-9_-]{40,}/ }, // Generic pattern; refine if Expo has specific format
  { name: "PostHog API Key", pattern: /phc_[A-Za-z0-9]{43}/ },
  { name: "PostHog Personal API Key", pattern: /phx_[A-Za-z0-9]{43}/ },
  { name: "OneSignal REST API Key", pattern: /[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}/ },
  { name: "OneSignal App ID", pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ },
  { name: "Neon API Key", pattern: /neon_api_key_[A-Za-z0-9]{32,}/ },
  { name: "Cloudflare API Token", pattern: /[A-Za-z0-9_-]{40}/ }, // Generic; Cloudflare tokens are base64-like
];

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.next/,
  /\.expo/,
  /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
];

interface Finding {
  file: string;
  line: number;
  pattern: string;
  match: string;
}

function shouldIgnoreFile(filePath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function scanFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      SECRET_PATTERNS.forEach((pattern) => {
        const match = line.match(pattern.pattern);
        if (match) {
          findings.push({
            file: filePath,
            line: index + 1,
            pattern: pattern.name,
            match: match[0].substring(0, 20) + "...",
          });
        }
      });
    });
  } catch (error) {
    // Skip binary files or unreadable files
  }

  return findings;
}

function scanDirectory(dir: string): Finding[] {
  let findings: Finding[] = [];

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    if (shouldIgnoreFile(fullPath)) {
      continue;
    }

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findings = findings.concat(scanDirectory(fullPath));
    } else if (stat.isFile()) {
      findings = findings.concat(scanFile(fullPath));
    }
  }

  return findings;
}

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const targetDir = args.find((arg) => !arg.startsWith("--")) || process.cwd();

  const findings = scanDirectory(targetDir);

  if (jsonOutput) {
    console.log(JSON.stringify({ findings, count: findings.length }, null, 2));
  } else {
    if (findings.length === 0) {
      console.log("✓ No secrets detected");
      process.exit(0);
    }

    console.error("✗ Secrets detected:");
    findings.forEach((finding) => {
      console.error(
        `  ${finding.file}:${finding.line} - ${finding.pattern}: ${finding.match}`
      );
    });

    process.exit(1);
  }
}

main();
