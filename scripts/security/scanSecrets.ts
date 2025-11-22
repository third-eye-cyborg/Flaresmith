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
