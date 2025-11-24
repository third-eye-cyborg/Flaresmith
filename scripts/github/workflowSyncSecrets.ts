#!/usr/bin/env tsx
/**
 * workflowSyncSecrets.ts
 *
 * Purpose: Run inside GitHub Actions to propagate repository (Actions) secrets
 *          into Codespaces, Dependabot, and environment (dev/staging/production) scopes.
 *
 * DIFFERENCE FROM distributeEnvSecrets:
 *  - This script assumes secret values are already loaded into process.env by the workflow.
 *  - It does NOT read a local .env file.
 *  - It uses provided allowlists to avoid unintentionally syncing all environment variables.
 *
 * SPEC TRACE: FR-001, FR-002, FR-005, FR-006, FR-012, FR-015.
 *
 * Usage (local dry run example):
 *   GITHUB_TOKEN=ghp_xxx node scripts/github/workflowSyncSecrets.ts --owner <o> --repo <r> --dry-run \
 *     --globals BUILDER_API_KEY,OPENAI_API_KEY --env-bases DATABASE_URL --env-branches NEON_BRANCH
 *
 * GitHub Action will pass inputs via env vars:
 *   SYNC_GLOBALS, SYNC_ENV_BASES, SYNC_ENV_BRANCHES, DRY_RUN
 */

import { Octokit } from 'octokit';
import * as sodium from 'libsodium-wrappers';

interface Args {
  owner: string;
  repo: string;
  dryRun: boolean;
  globals: string[];          // names to push to Actions + Codespaces + Dependabot + envs
  envBases: string[];          // names that may have *_DEV/_STAGING/_PROD variants
  envBranchBases: string[];    // special alias mapping (e.g., NEON_BRANCH_* -> NEON_BRANCH_ID)
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || '',
    dryRun: process.env.DRY_RUN === 'true' || false,
    globals: (process.env.SYNC_GLOBALS || '').split(',').map(s=>s.trim()).filter(Boolean),
    envBases: (process.env.SYNC_ENV_BASES || '').split(',').map(s=>s.trim()).filter(Boolean),
    envBranchBases: (process.env.SYNC_ENV_BRANCHES || '').split(',').map(s=>s.trim()).filter(Boolean),
  };
  // CLI overrides
  for (let i=0;i<argv.length;i++) {
    const a = argv[i];
    if (a === '--owner') args.owner = argv[++i]!;
    else if (a === '--repo') args.repo = argv[++i]!;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--globals') args.globals = argv[++i]!.split(',').map(s=>s.trim()).filter(Boolean);
    else if (a === '--env-bases') args.envBases = argv[++i]!.split(',').map(s=>s.trim()).filter(Boolean);
    else if (a === '--env-branches') args.envBranchBases = argv[++i]!.split(',').map(s=>s.trim()).filter(Boolean);
  }
  if (!args.owner || !args.repo) {
    console.error('Missing owner/repo (env or flags).');
    process.exit(1);
  }
  return args;
}

const ENVIRONMENTS = ['dev','staging','production'];
const SUFFIX_MAP: Record<string,string> = { DEV: 'dev', STAGING: 'staging', PROD: 'production' };

async function encrypt(publicKey: string, value: string): Promise<string> {
  await sodium.ready;
  const keyBytes = Buffer.from(publicKey,'base64');
  const valueBytes = Buffer.from(value);
  const enc = sodium.crypto_box_seal(valueBytes, keyBytes);
  return Buffer.from(enc).toString('base64');
}

async function upsertActionsSecret(octokit: Octokit, owner: string, repo: string, pk: { key: string; key_id: string }, name: string, value: string, dry: boolean) {
  if (!value) return; // skip empty
  if (dry) { console.log(`[DRY] Actions -> ${name}`); return; }
  const encrypted_value = await encrypt(pk.key, value);
  await octokit.request('PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}', {
    owner, repo, secret_name: name, encrypted_value, key_id: pk.key_id
  });
}

async function upsertScoped(octokit: Octokit, scope: 'codespaces'|'dependabot', owner: string, repo: string, name: string, value: string, dry: boolean) {
  if (!value) return;
  if (dry) { console.log(`[DRY] ${scope} -> ${name}`); return; }
  const pk = await octokit.request(`GET /repos/{owner}/{repo}/${scope}/secrets/public-key`, { owner, repo });
  const encrypted_value = await encrypt(pk.data.key, value);
  await octokit.request(`PUT /repos/{owner}/{repo}/${scope}/secrets/{secret_name}`, {
    owner, repo, secret_name: name, encrypted_value, key_id: pk.data.key_id
  });
}

async function ensureEnvironment(octokit: Octokit, owner: string, repo: string, env: string, dry: boolean) {
  try {
    await octokit.rest.repos.getEnvironment({ owner, repo, environment_name: env });
  } catch (e:any) {
    if (e.status === 404) {
      if (dry) { console.log(`[DRY] create env ${env}`); return; }
      await octokit.rest.repos.createOrUpdateEnvironment({ owner, repo, environment_name: env });
      console.log(`Created env ${env}`);
    } else {
      console.warn(`Env check ${env} failed: ${e.message}`);
    }
  }
}

async function upsertEnvironmentSecret(octokit: Octokit, owner: string, repo: string, env: string, name: string, value: string, dry: boolean) {
  if (!value) return;
  if (dry) { console.log(`[DRY] env:${env} -> ${name}`); return; }
  const pk = await octokit.request('GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key', { owner, repo, environment_name: env });
  const encrypted_value = await encrypt(pk.data.key, value);
  await octokit.request('PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}', {
    owner, repo, environment_name: env, secret_name: name, encrypted_value, key_id: pk.data.key_id
  });
}

function collectEnvSpecific(base: string): Record<string,string> {
  const out: Record<string,string> = {};
  for (const [suffix, envName] of Object.entries(SUFFIX_MAP)) {
    const key = `${base}_${suffix}`;
    const val = process.env[key];
    if (val) out[envName] = val;
  }
  return out;
}

async function run() {
  const args = parseArgs();
  const token = process.env.GITHUB_TOKEN || process.env.GH_SYNC_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN or GH_SYNC_TOKEN required');
    process.exit(1);
  }
  const octokit = new Octokit({ auth: token });
  const pk = await octokit.request('GET /repos/{owner}/{repo}/actions/secrets/public-key', { owner: args.owner, repo: args.repo });

  console.log(`Secrets workflow sync (dryRun=${args.dryRun})`);

  // 1. Globals
  for (const name of args.globals) {
    const value = process.env[name];
    if (!value) { console.log(`(skip missing) ${name}`); continue; }
    await upsertActionsSecret(octokit, args.owner, args.repo, pk.data, name, value, args.dryRun);
    await upsertScoped(octokit,'codespaces',args.owner,args.repo,name,value,args.dryRun);
    await upsertScoped(octokit,'dependabot',args.owner,args.repo,name,value,args.dryRun);
  }

  // 2. Environments
  for (const env of ENVIRONMENTS) await ensureEnvironment(octokit,args.owner,args.repo,env,args.dryRun);

  for (const base of args.envBases) {
    const map = collectEnvSpecific(base);
    for (const env of ENVIRONMENTS) {
      const value = map[env] || map['dev'] || process.env[base]; // fallback rules
      if (!value) continue;
      await upsertEnvironmentSecret(octokit,args.owner,args.repo,env,base,value,args.dryRun);
    }
  }

  // 3. Env branch alias (e.g., NEON_BRANCH_* -> NEON_BRANCH_ID)
  for (const branchBase of args.envBranchBases) {
    const map = collectEnvSpecific(branchBase);
    for (const env of ENVIRONMENTS) {
      const value = map[env];
      if (!value) continue;
      await upsertEnvironmentSecret(octokit,args.owner,args.repo,env,`${branchBase}_ID`,value,args.dryRun); // NEON_BRANCH_ID style
    }
  }

  console.log('Sync complete');
}

run().catch(e => { console.error('Fatal sync error:', e.message); process.exit(1); });
