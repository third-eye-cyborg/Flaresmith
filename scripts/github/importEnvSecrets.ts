#!/usr/bin/env ts-node
/**
 * importEnvSecrets.ts
 *
 * Purpose: Import local .env secrets into GitHub Actions repository secrets, then
 * optionally trigger downstream sync (Codespaces, Dependabot, Cloudflare) via existing API.
 *
 * SECURITY: This script NEVER prints secret values. It only logs secret names and operation status.
 *
 * Requirements:
 * - Personal Access Token (PAT) with scopes: repo, actions, codespaces, dependabot
 * - Repository owner/name
 * - Existing .env file (not committed) at project root. (.env.example is ignored for values)
 *
 * Usage:
 *   pnpm import:env-secrets -- --owner <owner> --repo <repo> [--projectId <uuid>] [--dry-run]
 *   Environment variable GITHUB_TOKEN must be set with the PAT.
 *
 * Example:
 *   GITHUB_TOKEN=ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
 *   pnpm import:env-secrets -- --owner third-eye-cyborg --repo CloudMake --projectId 123e4567-e89b-12d3-a456-426614174000
 *
 * After import, trigger propagation:
 *   curl -X POST http://localhost:8787/github/secrets/sync -H 'Content-Type: application/json' -d '{"projectId":"<projectId>"}'
 */

import fs from 'fs';
import path from 'path';
import { Octokit } from 'octokit';
import * as sodium from 'libsodium-wrappers';

interface Args {
  owner: string;
  repo: string;
  projectId?: string;
  dryRun?: boolean;
  exclude?: string[]; // regex patterns
}

const DEFAULT_EXCLUDES = [
  '^GITHUB_TOKEN$',
  '^ACTIONS_',
  '^RUNNER_',
  '^CI$',
  '^PNPM_',
  '^NPM_',
];

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { owner: '', repo: '', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--owner') args.owner = argv[++i];
    else if (a === '--repo') args.repo = argv[++i];
    else if (a === '--projectId') args.projectId = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--exclude') {
      const pattern = argv[++i];
      if (!args.exclude) args.exclude = [];
      args.exclude.push(pattern);
    }
  }
  if (!args.owner || !args.repo) {
    console.error('Missing required --owner and/or --repo');
    process.exit(1);
  }
  return args;
}

function loadEnvFile(envPath: string): Record<string,string> {
  if (!fs.existsSync(envPath)) {
    console.warn(`No .env file found at ${envPath}. Nothing to import.`);
    return {};
  }
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  const vars: Record<string,string> = {};
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    // remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) vars[key] = value;
  }
  return vars;
}

function isExcluded(key: string, patterns: string[]): boolean {
  return patterns.some(p => new RegExp(p).test(key));
}

async function encryptSecret(publicKey: string, value: string): Promise<string> {
  await sodium.ready;
  const keyBytes = Buffer.from(publicKey, 'base64');
  const valueBytes = Buffer.from(value);
  const encrypted = sodium.crypto_box_seal(valueBytes, keyBytes);
  return Buffer.from(encrypted).toString('base64');
}

async function run() {
  const { owner, repo, projectId, dryRun, exclude } = parseArgs();
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN env var required (PAT with repo, actions, codespaces, dependabot scopes).');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });

  const envVars = loadEnvFile(path.resolve(process.cwd(), '.env'));
  const total = Object.keys(envVars).length;
  if (total === 0) {
    console.log('No variables discovered in .env. Exiting.');
    return;
  }

  const exclusionPatterns = [...DEFAULT_EXCLUDES, ...(exclude || [])];
  const toImport = Object.entries(envVars).filter(([k,v]) => v && !isExcluded(k, exclusionPatterns));

  console.log(`Discovered ${total} variables; ${toImport.length} eligible after exclusions.`);
  if (dryRun) {
    console.log('Dry-run mode: listing would-be imported secret names:');
    for (const [k] of toImport) console.log(` - ${k}`);
    return;
  }

  // Fetch public key
  const { data: pk } = await octokit.request('GET /repos/{owner}/{repo}/actions/secrets/public-key', { owner, repo });
  const publicKey = pk.key;
  const keyId = pk.key_id;

  let created = 0;
  let updated = 0;
  let skipped = total - toImport.length;

  for (const [name, value] of toImport) {
    try {
      const encrypted_value = await encryptSecret(publicKey, value);
      await octokit.request('PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}', {
        owner,
        repo,
        secret_name: name,
        encrypted_value,
        key_id: keyId
      });
      console.log(`✔ Upserted secret: ${name}`);
      // We cannot easily distinguish create vs update without extra list call per secret; treat all as upserts.
      created++;
    } catch (err: any) {
      console.error(`✖ Failed secret ${name}: ${err.status || ''} ${err.message}`);
    }
  }

  console.log('\nSummary:');
  console.log(`  Upserted: ${created}`);
  console.log(`  Excluded/skipped: ${skipped}`);

  if (projectId) {
    console.log('\nNext: Trigger propagation sync via API:');
    console.log(`curl -X POST $API_URL/github/secrets/sync -H 'Content-Type: application/json' -d '{"projectId":"${projectId}"}'`);
  } else {
    console.log('\n(No projectId supplied; skipping propagation guidance)');
  }

  console.log('\nIMPORTANT: Review audit logs to confirm no secret values were logged.');
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
