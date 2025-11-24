/**
 * T003: Database migration runner for Neon branches
 *
 * Usage:
 *  pnpm ts-node scripts/db/runMigrations.ts --env dev
 *  pnpm ts-node scripts/db/runMigrations.ts --env staging
 *  pnpm ts-node scripts/db/runMigrations.ts --env prod
 *  pnpm ts-node scripts/db/runMigrations.ts --url $DATABASE_URL
 *
 * Environment mapping (if --env provided):
 *  dev     -> process.env.DATABASE_URL_DEV
 *  staging -> process.env.DATABASE_URL_STAGING
 *  prod    -> process.env.DATABASE_URL_PROD
 * Falls back to process.env.DATABASE_URL if specific one not found.
 *
 * Idempotency: Each SQL file should use CREATE IF NOT EXISTS / DO blocks to avoid errors.
 * This runner records applied migrations in _migration_log table (created automatically).
 */
// Use dynamic import for neon to avoid ESM/CJS cycle issues when using ts-node loaders.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let neonImport: any;
async function getNeon() {
  if (!neonImport) {
    neonImport = await import("@neondatabase/serverless");
  }
  return neonImport.neon;
}
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname for ESM context (type: module in root package.json)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type CliArgs = {
  env?: string;
  url?: string;
  dryRun?: boolean;
};

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  for (let i = 2; i < process.argv.length; i++) {
    const val = process.argv[i];
    if (val === "--env") args.env = process.argv[++i]!;
    else if (val === "--url") args.url = process.argv[++i]!;
    else if (val === "--dry") args.dryRun = true;
  }
  return args;
}

function resolveDatabaseUrl(cli: CliArgs): string {
  if (cli.url) return cli.url;
  if (cli.env) {
    const map: Record<string, string | undefined> = {
      dev: process.env.DATABASE_URL_DEV,
      staging: process.env.DATABASE_URL_STAGING,
      prod: process.env.DATABASE_URL_PROD,
    };
    const specific = map[cli.env];
    if (specific) return specific;
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    throw new Error(`No database URL found for env '${cli.env}'. Set DATABASE_URL_${cli.env.toUpperCase()} or pass --url.`);
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error("DATABASE_URL not set. Provide --url or set env variables.");
}

// Relax Neon type strictness: treat sql as any to avoid type mismatch with differing generics in dependency version.
// This is safe for our simple usage pattern (raw string queries, parameter substitution) and avoids TS2345 errors.
// Underlying runtime API remains unchanged; adjust if upgrading @neondatabase/serverless.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureMigrationLog(sql: any) {
  await sql(`CREATE TABLE IF NOT EXISTS _migration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function alreadyApplied(sql: any, filename: string): Promise<boolean> {
  const rows: any = await sql`SELECT 1 FROM _migration_log WHERE filename = ${filename}`;
  return Array.isArray(rows) && rows.length > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markApplied(sql: any, filename: string) {
  await sql`INSERT INTO _migration_log (filename) VALUES (${filename}) ON CONFLICT (filename) DO NOTHING`;
}

function loadSqlFiles(): string[] {
  const dir = path.resolve(__dirname, "../..", "apps", "api", "db", "migrations");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql"));
  files.sort();
  return files.map(f => path.join(dir, f));
}

function splitStatements(fileContent: string): string[] {
  // Preserve DO $$ ... $$; blocks and avoid naive semicolon splits inside them
  const statements: string[] = [];
  let buffer = "";
  let inDollarBlock = false;
  const lines = fileContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--")) continue; // skip comments
    // Detect start/end of dollar blocks (simplistic) - assumes no nested blocks
    if (trimmed.startsWith("DO $$")) inDollarBlock = true;
    if (inDollarBlock) {
      buffer += line + "\n";
      if (trimmed.endsWith("$$;")) {
        statements.push(buffer.trim());
        buffer = "";
        inDollarBlock = false;
      }
      continue;
    }
    buffer += line + "\n";
    if (trimmed.endsWith(";")) {
      statements.push(buffer.trim());
      buffer = "";
    }
  }
  const final = buffer.trim();
  if (final) statements.push(final);
  return statements.filter(s => s.length > 0);
}

async function run() {
  const cli = parseArgs();
  const dbUrl = resolveDatabaseUrl(cli);
  console.log(`\n[Migration] Target URL: ${dbUrl.replace(/:[^:]*@/, ':****@')}`); // redact password
  const neon = await getNeon();
  const sql = neon(dbUrl);
  if (cli.dryRun) console.log("[Migration] DRY RUN - no statements executed");
  await ensureMigrationLog(sql);
  const files = loadSqlFiles();
  console.log(`[Migration] Found ${files.length} migration files`);
  for (const file of files) {
    const filename = path.basename(file);
    const applied = await alreadyApplied(sql, filename);
    if (applied) {
      console.log(`[-] Skip (already applied): ${filename}`);
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    const statements = splitStatements(content);
    console.log(`[+] Applying ${filename} (${statements.length} statements)`);
    if (!cli.dryRun) {
      for (const stmt of statements) {
        try {
          await sql(stmt);
        } catch (err: any) {
          console.error(`    ! Error executing statement in ${filename}:`, err.message);
          throw err;
        }
      }
      await markApplied(sql, filename);
    }
  }
  console.log("\n[Migration] Complete.");
}

run().catch(err => {
  console.error("[Migration] Failed:", err);
  process.exit(1);
});
