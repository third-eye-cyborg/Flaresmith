#!/usr/bin/env ts-node

import { Command } from "commander";
import { CloudMakeClient } from "@cloudmake/api-client";
import { getEnv } from "@flaresmith/utils";
import fs from "fs";
import path from "path";

/**
 * T060: Add CLI script for project provisioning
 * Command-line tool for creating projects
 */

const program = new Command();

program
  .name("create-project")
  .description("Create a new CloudMake project with automated provisioning")
  .requiredOption("-n, --name <name>", "Project name")
  .option("-s, --slug <slug>", "Project slug (auto-generated from name if not provided)")
  .option("-o, --org <orgId>", "Organization ID", "default")
  .option("--dual-auth", "Scaffold dual authentication app layout (admin/user web + mobile)", true)
  .option("--no-github", "Skip GitHub integration")
  .option("--no-cloudflare", "Skip Cloudflare integration")
  .option("--no-neon", "Skip Neon database integration")
  .option("--no-postman", "Skip Postman integration")
  .option("--no-codespaces", "Skip GitHub Codespaces integration")
  .action(async (options) => {
    try {
      const apiUrl = getEnv("API_URL", "http://localhost:8787");
      const apiKey = getEnv("API_KEY", "");

      const client = new CloudMakeClient({
        baseUrl: apiUrl,
        apiKey,
      });

      // Generate slug from name if not provided
      const slug =
        options.slug ||
        options.name
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

      console.log("Creating project...");
      console.log(`  Name: ${options.name}`);
      console.log(`  Slug: ${slug}`);
      console.log(`  Organization: ${options.org}`);
      console.log(`  Integrations:`);
      console.log(`    - GitHub: ${options.github ? "✓" : "✗"}`);
      console.log(`    - Cloudflare: ${options.cloudflare ? "✓" : "✗"}`);
      console.log(`    - Neon: ${options.neon ? "✓" : "✗"}`);
      console.log(`    - Postman: ${options.postman ? "✓" : "✗"}`);
      console.log(`    - Codespaces: ${options.codespaces ? "✓" : "✗"}`);
      console.log("");

      const result = await client.projects.create({
        name: options.name,
        slug,
        orgId: options.org,
        integrations: {
          github: options.github,
          cloudflare: options.cloudflare,
          neon: options.neon,
          postman: options.postman,
          codespaces: options.codespaces,
        },
      });

      console.log("✓ Project created successfully!");
      console.log(`  ID: ${result.projectId}`);
      console.log(`  Status: ${result.status}`);

      if (result.integrations.githubRepo) {
        console.log(`  GitHub: ${result.integrations.githubRepo}`);
      }
      if (result.integrations.neonProjectId) {
        console.log(`  Neon: ${result.integrations.neonProjectId}`);
      }
      if (result.integrations.cloudflareAccountId) {
        console.log(`  Cloudflare: ${result.integrations.cloudflareAccountId}`);
      }
      if (result.integrations.postmanWorkspaceId) {
        console.log(`  Postman: ${result.integrations.postmanWorkspaceId}`);
      }

      console.log("");
      console.log(`View project: ${apiUrl}/projects/${result.projectId}`);

      // Dual auth scaffolding (local filesystem) – idempotent
      if (options.dualAuth) {
        try {
          console.log("\nScaffolding dual-auth application structure...");
          scaffoldDualAuth();
          console.log("✓ Dual-auth scaffold complete");
        } catch (e: any) {
          console.warn("⚠ Dual-auth scaffolding failed (non-fatal):", e.message);
        }
      }
    } catch (error: any) {
      console.error("✗ Project creation failed:");
      console.error(`  ${error.message}`);
      process.exit(1);
    }
  });

program.parse();

/**
 * Idempotently scaffold dual authentication app directories, template files, and sample env hints.
 * This operates only on the current monorepo working directory and never overwrites existing user code.
 */
function scaffoldDualAuth() {
  const root = process.cwd();
  const appsDir = path.join(root, "apps");
  const templateDir = path.join(root, "templates");

  ensureDir(appsDir);
  ensureDir(templateDir);

  // Expected app directories
  const appTargets = [
    { dir: "admin-web", type: "web" },
    { dir: "user-web", type: "web" },
    { dir: "admin-mobile", type: "mobile" },
    { dir: "user-mobile", type: "mobile" },
  ];

  for (const target of appTargets) {
    const fullPath = path.join(appsDir, target.dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`  Created app directory: ${target.dir}`);
      // Minimal README stub
      const readmePath = path.join(fullPath, "README.md");
      if (!fs.existsSync(readmePath)) {
        fs.writeFileSync(
          readmePath,
          `# ${target.dir}\n\nScaffolded ${target.type} surface for dual authentication architecture.\n\nRefer to specs/005-dual-auth-architecture/spec.md for functional requirements.\n`
        );
      }
    } else {
      console.log(`  Skipped existing app directory: ${target.dir}`);
    }
  }

  // Template examples directory tree
  const templateAppsDir = path.join(templateDir, "apps");
  ensureDir(templateAppsDir);
  // Provide admin users example route if absent
  const adminUsersExample = path.join(templateAppsDir, "admin-web/app/admin/users/page.tsx");
  ensureFile(adminUsersExample, getAdminUsersTemplate());
  // Provide user dashboard example route if absent
  const userDashboardExample = path.join(templateAppsDir, "user-web/app/dashboard/page.tsx");
  ensureFile(userDashboardExample, getUserDashboardTemplate());

  // API templates
  const apiRoutesDir = path.join(templateAppsDir, "api/src/routes/webhooks");
  ensureDir(apiRoutesDir);
  const polarWebhookExample = path.join(apiRoutesDir, "polar.ts");
  ensureFile(polarWebhookExample, getPolarWebhookTemplate());

  const apiMigrationsDir = path.join(templateAppsDir, "api/db/migrations");
  ensureDir(apiMigrationsDir);
  const rlsBaseline = path.join(apiMigrationsDir, "rls.sql");
  ensureFile(rlsBaseline, getRlsBaselineTemplate());

  const apiTestsDir = path.join(templateAppsDir, "api/tests/auth");
  ensureDir(apiTestsDir);
  const placeholderTest = path.join(apiTestsDir, "placeholder.test.ts");
  ensureFile(placeholderTest, getAuthPlaceholderTestTemplate());

  // Sample env hints
  const envExample = path.join(root, ".env.example");
  if (fs.existsSync(envExample)) {
    const content = fs.readFileSync(envExample, "utf8");
    if (!content.includes("NEXT_PUBLIC_APP_TYPE")) {
      fs.appendFileSync(
        envExample,
        "\n# Dual-auth application type flags\nNEXT_PUBLIC_APP_TYPE=user\nEXPO_PUBLIC_APP_TYPE=user\n"
      );
      console.log("  App type flags appended to .env.example");
    }
  }
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureFile(pathName: string, content: string) {
  const dirName = path.dirname(pathName);
  ensureDir(dirName);
  if (!fs.existsSync(pathName)) {
    fs.writeFileSync(pathName, content);
    console.log(`  Added template: ${pathName.replace(process.cwd() + path.sep, "")}`);
  }
}

// Template generators
function getAdminUsersTemplate() {
  return `// Admin Users Example Route\n// Spec trace: FR-001 (admin auth), FR-022 (user forbidden), SC-005 (fast rejection)\nimport React from 'react';\nexport default function AdminUsersPage() {\n  return (\n    <div style={{ padding: 32 }}>\n      <h1>Admin – Users</h1>\n      <p>This is a template example route. Implement list via /api/admin/users/list.ts</p>\n    </div>\n  );\n}\n`;
}

function getUserDashboardTemplate() {
  return `// User Dashboard Example Route\n// Spec trace: FR-002 (user auth), FR-005a/FR-005b (billing integration), SC-013 (checkout performance)\nimport React from 'react';\nexport default function UserDashboardPage() {\n  return (\n    <div style={{ padding: 32 }}>\n      <h1>User Dashboard</h1>\n      <p>Subscription status & recent activity placeholder.</p>\n    </div>\n  );\n}\n`;
}

function getPolarWebhookTemplate() {
  return `// Polar Webhook Handler (Template)\n// Spec trace: FR-005a (web billing), FR-071 (webhook handler), SC-013 (performance target)\nimport type { IncomingRequestCf } from '@cloudflare/workers-types';\nexport const onRequestPost: PagesFunction = async ({ request }) => {\n  const body = await request.text();\n  // TODO: verify signature & update subscription status\n  return new Response(JSON.stringify({ received: true }), { status: 200 });\n};\n`;
}

function getRlsBaselineTemplate() {
  return `-- RLS Baseline (Template)\n-- Spec trace: FR-013 (RLS policies), SC-003 (100% unauthorized query prevention)\nALTER TABLE users ENABLE ROW LEVEL SECURITY;\n-- Additional policy statements inserted during feature application.\n`;
}

function getAuthPlaceholderTestTemplate() {
  return `// Auth Placeholder Test (Template)\n// Spec trace: FR-022 (cross-role rejection), SC-005 (fast 403)\ndescribe('auth placeholder', () => {\n  it('should be replaced by real tests after provisioning', () => {\n    expect(true).toBe(true);\n  });\n});\n`;
}
