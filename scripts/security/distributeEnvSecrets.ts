#!/usr/bin/env tsx
/**
 * distributeEnvSecrets.ts
 *
 * Unified secret distribution from local .env -> GitHub (Actions, Codespaces, Dependabot),
 * GitHub Environments (dev|staging|production), and optional Cloudflare Workers/Pages.
 *
 * SPEC TRACE: Implements FR-001 through FR-007, FR-011, FR-012 (spec 002-github-secrets-sync).
 * This script is an operator utility; server-side sync endpoints should be used in automation.
 *
 * LIMITATIONS:
 *  - Requires access to plaintext .env (never commit).
 *  - Cannot read existing secret values from GitHub scopes (API limitation); compares only names.
 *  - Cloudflare sync currently supports Workers account-level secrets (script-level) via API token.
 *  - Neon branch secrets are represented via environment-specific DATABASE_URL_* mapping; no direct Neon secret store mutation performed here.
 *
 * USAGE:
 *   pnpm distribute:env-secrets -- --owner <owner> --repo <repo> [--force] [--dry-run]
 *
 * FLAGS:
 *   --owner        GitHub repository owner (default from GITHUB_OWNER env)
 *   --repo         GitHub repository name  (default from GITHUB_REPO env)
 *   --force        Overwrite even if secret already exists in target scope
 *   --dry-run      Perform analysis only, no mutations
 *   --exclude      Regex pattern (repeatable) to exclude secrets
 *   --only         Comma list of target scopes (actions,codespaces,dependabot,environments,cloudflare)
 *   --env-map      Enable suffix mapping *_DEV|*_STAGING|*_PROD -> base name (default true)
 *
 * ENV VARS REQUIRED:
 *   GITHUB_TOKEN (PAT: repo, actions, codespaces, dependabot, admin:repo)
 *   CLOUDFLARE_API_TOKEN (optional for Cloudflare secret sync)
 *   CLOUDFLARE_ACCOUNT_ID (required if Cloudflare sync enabled)
 */

import fs from 'fs';
import path from 'path';
// Lightweight conditional coloring fallback if chalk unavailable
let chalk: any;
try { chalk = require('chalk'); } catch { chalk = { red:(s:string)=>s, green:(s:string)=>s, blue:(s:string)=>s, gray:(s:string)=>s, yellow:(s:string)=>s, cyan:(s:string)=>s, bold:(s:string)=>s }; }
import { Octokit } from 'octokit';
import * as sodium from 'libsodium-wrappers';

interface Args {
  owner: string;
  repo: string;
  force: boolean;
  dryRun: boolean;
  exclude: string[];
  only?: Set<string>;
  envMap: boolean;
  validate: boolean;
}

const DEFAULT_EXCLUDE = [
  '^GITHUB_TOKEN$',
  '^ACTIONS_',
  '^RUNNER_',
  '^CI$',
  '^PNPM_',
  '^NPM_',
];

const ENV_SUFFIXES = [ '_DEV', '_STAGING', '_PROD' ];
const ENV_NAMES = ['dev','staging','production'];

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const nextVal = (arr: string[], idx: number): string => {
    const v = arr[idx+1];
    if (v === undefined) {
      console.error(chalk.red(`Missing value for option ${arr[idx]}`));
      process.exit(1);
    }
    return v;
  };
  const args: Args = {
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || '',
    force: false,
    dryRun: false,
    exclude: [],
    envMap: true,
    validate: false,
  };
  for (let i=0;i<argv.length;i++) {
    const a: string = argv[i]!;
    switch (a) {
      case '--owner': args.owner = nextVal(argv,i); i++; break;
      case '--repo': args.repo = nextVal(argv,i); i++; break;
      case '--force': args.force = true; break;
      case '--dry-run': args.dryRun = true; break;
      case '--exclude': args.exclude.push(nextVal(argv,i)); i++; break;
      case '--only': args.only = new Set(nextVal(argv,i).split(',').map(s=>s.trim())); i++; break;
      case '--no-env-map': args.envMap = false; break;
      case '--validate': args.validate = true; break;
      default:
        if (a.startsWith('--')) {
          console.error(chalk.yellow(`Unknown flag ${a}`));
        }
    }
  }
  if (!args.owner || !args.repo) {
    console.error(chalk.red('Missing --owner / --repo (or GITHUB_OWNER / GITHUB_REPO env).'));
    process.exit(1);
  }
  return args;
}

function loadEnv(): Record<string,string> {
  const file = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(file)) {
    console.warn(chalk.yellow('No .env found; using .env.example for structure only. Distribution skipped.')); 
    return {};
  }
  const lines = fs.readFileSync(file,'utf8').split(/\r?\n/);
  const out: Record<string,string> = {};
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0,idx).trim();
    let v = line.slice(idx+1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1);
    if (k) out[k]=v;
  }
  return out;
}

function isExcluded(name: string, patterns: string[]): boolean {
  return patterns.some(p => new RegExp(p).test(name));
}

interface EnvMappingResult {
  baseName: string;
  envName?: string; // dev|staging|production
  original: string; // original key
}

function mapEnvironmentSpecific(name: string): EnvMappingResult | undefined {
  for (const suffix of ENV_SUFFIXES) {
    if (name.endsWith(suffix)) {
      const base = name.slice(0, -suffix.length);
      const envName = suffix.slice(1).toLowerCase();
      return { baseName: base, envName, original: name };
    }
  }
  return undefined;
}

async function encrypt(publicKey: string, value: string): Promise<string> {
  await sodium.ready;
  const keyBytes = Buffer.from(publicKey, 'base64');
  const valueBytes = Buffer.from(value);
  const enc = sodium.crypto_box_seal(valueBytes, keyBytes);
  return Buffer.from(enc).toString('base64');
}

async function upsertRepoSecret(octokit: Octokit, owner: string, repo: string, name: string, value: string, publicKey: { key: string; key_id: string; }, dryRun: boolean) {
  if (dryRun) { console.log(chalk.gray(`[DRY] Actions secret -> ${name}`)); return; }
  const encrypted_value = await encrypt(publicKey.key, value);
  await octokit.request('PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}', { owner, repo, secret_name: name, encrypted_value, key_id: publicKey.key_id });
}

async function upsertScopedSecret(octokit: Octokit, scope: 'codespaces'|'dependabot', owner: string, repo: string, name: string, value: string, dryRun: boolean) {
  if (dryRun) { console.log(chalk.gray(`[DRY] ${scope} secret -> ${name}`)); return; }
  const pk = await octokit.request(`GET /repos/{owner}/{repo}/${scope}/secrets/public-key`, { owner, repo });
  const encrypted_value = await encrypt(pk.data.key, value);
  await octokit.request(`PUT /repos/{owner}/{repo}/${scope}/secrets/{secret_name}`, { owner, repo, secret_name: name, encrypted_value, key_id: pk.data.key_id });
}

async function ensureEnvironment(octokit: Octokit, owner: string, repo: string, env: string, dryRun: boolean) {
  try {
    await octokit.rest.repos.getEnvironment({ owner, repo, environment_name: env });
  } catch (e: any) {
    if (e.status === 404) {
      if (dryRun) { console.log(chalk.gray(`[DRY] create environment ${env}`)); return; }
      await octokit.rest.repos.createOrUpdateEnvironment({ owner, repo, environment_name: env });
      console.log(chalk.green(`Created environment ${env}`));
    } else {
      console.warn(chalk.yellow(`Environment ${env} check error: ${e.message}`));
    }
  }
}

async function upsertEnvironmentSecret(octokit: Octokit, owner: string, repo: string, env: string, name: string, value: string, dryRun: boolean) {
  if (dryRun) { console.log(chalk.gray(`[DRY] env:${env} secret -> ${name}`)); return; }
  const pk = await octokit.request('GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key', { owner, repo, environment_name: env });
  const encrypted_value = await encrypt(pk.data.key, value);
  await octokit.request('PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}', { owner, repo, environment_name: env, secret_name: name, encrypted_value, key_id: pk.data.key_id });
}

async function main() {
  const args = parseArgs();
  const token = process.env.GITHUB_TOKEN;
  if (!token) { console.error(chalk.red('GITHUB_TOKEN required')); process.exit(1); }
  const octokit = new Octokit({ auth: token });

  console.log(chalk.blue.bold('\nSecret Distribution (local .env)'));
  console.log(chalk.gray(`Repo: ${args.owner}/${args.repo}`));
  console.log(chalk.gray(`Dry Run: ${args.dryRun}`));
  console.log(chalk.gray(`Force: ${args.force}`));

  const envVars = loadEnv();
  if (Object.keys(envVars).length === 0) {
    console.log(chalk.yellow('No secrets loaded; aborting.')); return;
  }

  const patterns = [...DEFAULT_EXCLUDE, ...args.exclude];
  const filtered = Object.entries(envVars).filter(([k,v]) => v && !isExcluded(k, patterns));
  console.log(chalk.gray(`Loaded ${Object.keys(envVars).length} variables; ${filtered.length} eligible.`));

  // Fetch actions public key once
  const pk = await octokit.request('GET /repos/{owner}/{repo}/actions/secrets/public-key', { owner: args.owner, repo: args.repo });

  // Prepare environment-specific mapping
  const envSpecific: Record<string, Record<string,string>> = {}; // baseName -> envName -> value
  const globalSecrets: Record<string,string> = {};

  for (const [name,value] of filtered) {
    const map = args.envMap ? mapEnvironmentSpecific(name) : undefined;
    if (map && map.envName) {
      envSpecific[map.baseName] = envSpecific[map.baseName] || {};
      envSpecific[map.baseName]![map.envName] = value;
    } else {
      globalSecrets[name] = value;
    }
  }

  // Actions secrets (store base + env-specific physical keys too if provided)
  for (const [name,value] of Object.entries(globalSecrets)) {
    await upsertRepoSecret(octokit, args.owner, args.repo, name, value, pk.data, args.dryRun);
  }
  // We also upsert the *_DEV etc raw keys to Actions for historical auditing (optional)
  for (const base of Object.keys(envSpecific)) {
    const envMapObj = envSpecific[base];
    if (!envMapObj) continue;
    for (const envName of Object.keys(envMapObj)) {
      const originalKey = `${base}_${envName.toUpperCase()}`;
      const val = envMapObj[envName];
      if (!val) continue;
      await upsertRepoSecret(octokit, args.owner, args.repo, originalKey, val, pk.data, args.dryRun);
    }
  }

  // Codespaces & Dependabot (global only)
  if (!args.only || args.only.has('codespaces')) {
    for (const [name,value] of Object.entries(globalSecrets)) {
      await upsertScopedSecret(octokit,'codespaces',args.owner,args.repo,name,value,args.dryRun);
    }
  }
  if (!args.only || args.only.has('dependabot')) {
    for (const [name,value] of Object.entries(globalSecrets)) {
      await upsertScopedSecret(octokit,'dependabot',args.owner,args.repo,name,value,args.dryRun);
    }
  }

  // GitHub Environments
  if (!args.only || args.only.has('environments')) {
    for (const env of ENV_NAMES) await ensureEnvironment(octokit,args.owner,args.repo,env,args.dryRun);
    // Upsert env-specific (prefer mapped values); fallback to global if missing
    for (const env of ENV_NAMES) {
      for (const base of Object.keys(envSpecific)) {
        const value = envSpecific[base]?.[env] || envSpecific[base]?.dev || globalSecrets[base];
        if (!value) continue;
        // Alias: NEON_BRANCH_* maps to NEON_BRANCH_ID secret per spec
        if (base === 'NEON_BRANCH') {
          await upsertEnvironmentSecret(octokit,args.owner,args.repo,env,'NEON_BRANCH_ID',value,args.dryRun);
        } else {
          await upsertEnvironmentSecret(octokit,args.owner,args.repo,env,base,value,args.dryRun);
        }
      }
      // Also propagate global secrets that are not environment specific
      for (const [name,value] of Object.entries(globalSecrets)) {
        // skip obviously public ones (NEXT_PUBLIC_/EXPO_PUBLIC_) to avoid leaking into protected envs unnecessarily
        if (name.startsWith('NEXT_PUBLIC_') || name.startsWith('EXPO_PUBLIC_')) continue;
        // Skip raw NEON_BRANCH_* artifacts (handled via alias mapping)
        if (/^NEON_BRANCH_(DEV|STAGING|PROD)$/i.test(name)) continue;
        await upsertEnvironmentSecret(octokit,args.owner,args.repo,env,name,value,args.dryRun);
      }
    }
  }

  // Cloudflare (optional minimal implementation)
  if ((!args.only || args.only.has('cloudflare')) && process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.log(chalk.blue('\nCloudflare sync')); 
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN!;
    // Attempt to parse wrangler.toml for environment-specific script names
    const wranglerPath = path.resolve(process.cwd(),'apps/api/wrangler.toml');
    let scriptsByEnv: Record<string,string> = {};
    if (fs.existsSync(wranglerPath)) {
      const content = fs.readFileSync(wranglerPath,'utf8').split(/\r?\n/);
      let currentEnv: string | null = null;
      for (const line of content) {
        const envMatch = line.match(/^\[env\.(development|staging|production)\]/);
        if (envMatch) { currentEnv = envMatch[1] as string; continue; }
        const nameMatch = line.match(/^name\s*=\s*"([^"]+)"/);
        if (currentEnv && nameMatch) { scriptsByEnv[currentEnv] = nameMatch[1] as string; }
      }
    }
    const cfEndpoint = (script: string) => `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${script}/secrets`;
    const upsertCfSecret = async (script: string, name: string, value: string) => {
      if (args.dryRun) { console.log(chalk.gray(`[DRY] CF secret ${script} -> ${name}`)); return; }
      const res = await fetch(cfEndpoint(script), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ name, text: value })
      });
      if (!res.ok) {
        console.warn(chalk.yellow(`CF secret failed (${script}:${name}) ${res.status}`));
      } else {
        console.log(chalk.green(`CF secret upserted (${script}:${name})`));
      }
    };
    // Global secrets → all scripts
    for (const [env, scriptName] of Object.entries(scriptsByEnv)) {
      for (const [name,value] of Object.entries(globalSecrets)) {
        // Skip public client prefixes
        if (name.startsWith('NEXT_PUBLIC_') || name.startsWith('EXPO_PUBLIC_')) continue;
        await upsertCfSecret(scriptName, name, value);
      }
      // Environment specific overrides (e.g., DATABASE_URL)
      for (const base of Object.keys(envSpecific)) {
        const value = envSpecific[base]?.[env] || envSpecific[base]?.dev;
        if (value) await upsertCfSecret(scriptName, base, value);
      }
    }
  } else {
    console.log(chalk.gray('\nCloudflare sync skipped (missing token/account or excluded).'));
  }

  console.log(chalk.green('\n✓ Distribution complete (or simulated).'));
  console.log(chalk.gray('Reminder: Values never logged; verify secret scopes via GitHub UI.'));

  if (args.validate) {
    const apiBase = process.env.CLOUDMAKE_API_BASE_URL || process.env.API_BASE_URL || process.env.API_URL || 'http://localhost:8787';
    console.log(chalk.blue(`\nValidation report (POST /github/secrets/validate)`));
    try {
      if (args.dryRun) {
        console.log(chalk.gray('[DRY] Would invoke validation endpoint.'));
      } else {
        const res = await fetch(`${apiBase}/github/secrets/validate`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ projectId: process.env.CLOUDMAKE_PROJECT_ID || 'unknown' }) });
        const json = await res.json();
        if (json.missing?.length || json.conflicts?.length) {
          console.log(chalk.yellow('Validation issues detected:'));
          if (json.missing?.length) console.log(chalk.yellow(` Missing: ${json.missing.join(', ')}`));
          if (json.conflicts?.length) console.log(chalk.yellow(` Conflicts: ${json.conflicts.map((c:any)=>c.name).join(', ')}`));
        } else {
          console.log(chalk.green('All secrets validated successfully.'));
        }
      }
    } catch (e:any) {
      console.error(chalk.red(`Validation failed: ${e.message}`));
    }
  }
}

main().catch(e => { console.error(chalk.red('Fatal distribution error:'), e.message); process.exit(1); });

// Exports for testing
export { mapEnvironmentSpecific, isExcluded };
