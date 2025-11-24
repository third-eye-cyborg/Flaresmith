#!/usr/bin/env ts-node
/**
 * sync-auth CLI
 *
 * Idempotently synchronizes dual authentication template artifacts into the working repository.
 * Traces Spec 005 (Dual Auth Architecture) FR-001..FR-013, FR-071 and SC-003/SC-005.
 *
 * Responsibilities:
 *  - Ensure template files exist (admin/user web routes, RLS baseline, webhook handler, auth test stub)
 *  - NEVER overwrite existing custom user code
 *  - Append FR/SC trace comments if missing
 *  - Report a summary table of actions (created | skipped)
 *
 * Usage:
 *   pnpm exec ts-node scripts/spec/syncAuth.ts
 */

import fs from 'fs';
import path from 'path';

interface TemplateFile {
  relPath: string;
  content: string;
  traces: string[]; // FR/SC IDs
}

const root = process.cwd();
const templates: TemplateFile[] = [
  {
    relPath: 'templates/apps/admin-web/app/admin/users/page.tsx',
    traces: ['FR-001', 'FR-022', 'SC-005'],
    content: `// Admin Users Example Route\n// Traces: FR-001, FR-022, SC-005\nimport React from 'react';\nexport default function AdminUsersPage() {\n  return (\n    <div style={{ padding: 32 }}>\n      <h1>Admin – Users</h1>\n      <p>Template route – implement user listing via /api/admin/users/list.ts</p>\n    </div>\n  );\n}\n`,
  },
  {
    relPath: 'templates/apps/user-web/app/dashboard/page.tsx',
    traces: ['FR-002', 'FR-005a', 'FR-005b'],
    content: `// User Dashboard Example Route\n// Traces: FR-002, FR-005a, FR-005b\nimport React from 'react';\nexport default function UserDashboardPage() {\n  return (\n    <div style={{ padding: 32 }}>\n      <h1>User Dashboard</h1>\n      <p>Subscription + activity placeholder.</p>\n    </div>\n  );\n}\n`,
  },
  {
    relPath: 'templates/apps/api/db/migrations/rls.sql',
    traces: ['FR-013', 'SC-003'],
    content: `-- RLS Baseline (Template)\n-- Traces: FR-013, SC-003\nALTER TABLE users ENABLE ROW LEVEL SECURITY;\n-- Additional policy statements inserted during feature application.\n`,
  },
  {
    relPath: 'templates/apps/api/src/routes/webhooks/polar.ts',
    traces: ['FR-071', 'SC-013'],
    content: `// Polar Webhook Handler (Template)\n// Traces: FR-071, SC-013\nimport type { IncomingRequestCf } from '@cloudflare/workers-types';\nexport const onRequestPost: PagesFunction = async ({ request }) => {\n  const body = await request.text();\n  // TODO: verify signature & update subscription status\n  return new Response(JSON.stringify({ received: true }), { status: 200 });\n};\n`,
  },
  {
    relPath: 'templates/apps/api/tests/auth/placeholder.test.ts',
    traces: ['FR-022', 'SC-005'],
    content: `// Auth Placeholder Test (Template)\n// Traces: FR-022, SC-005\ndescribe('auth placeholder', () => {\n  it('should be replaced by real tests after provisioning', () => {\n    expect(true).toBe(true);\n  });\n});\n`,
  },
];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

interface ResultRow { file: string; action: 'created' | 'skipped'; }
const results: ResultRow[] = [];

for (const tpl of templates) {
  const abs = path.join(root, tpl.relPath);
  ensureDir(path.dirname(abs));
  if (!fs.existsSync(abs)) {
    fs.writeFileSync(abs, tpl.content);
    results.push({ file: tpl.relPath, action: 'created' });
  } else {
    // Idempotency: do not overwrite – ensure trace IDs present
    const existing = fs.readFileSync(abs, 'utf8');
    const missingTraces = tpl.traces.filter(t => !existing.includes(t));
    if (missingTraces.length) {
      fs.appendFileSync(abs, `\n// Added missing trace refs: ${missingTraces.join(', ')}\n`);
    }
    results.push({ file: tpl.relPath, action: 'skipped' });
  }
}

// Summary output
console.log('\nDual Auth Template Sync Summary');
console.log('--------------------------------');
for (const row of results) {
  console.log(`${row.action === 'created' ? '✓' : '◦'} ${row.file} (${row.action})`);
}
console.log('\nAll operations idempotent.');
