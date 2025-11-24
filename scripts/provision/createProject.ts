#!/usr/bin/env ts-node

import { Command } from "commander";
import { CloudMakeClient } from "@cloudmake/api-client";
import { getEnv } from "@cloudmake/utils";

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
    } catch (error: any) {
      console.error("✗ Project creation failed:");
      console.error(`  ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
