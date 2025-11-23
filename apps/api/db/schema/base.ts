import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, integer } from "drizzle-orm/pg-core";

/**
 * T017: Create base database schema for core entities
 * Defines foundational tables used across all features
 */

// Enums
export const projectStatusEnum = pgEnum("project_status", ["provisioning", "active", "failed"]);
export const environmentKindEnum = pgEnum("environment_kind", ["core", "preview"]);
export const deploymentStatusEnum = pgEnum("deployment_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "rolledback",
]);
export const buildStatusEnum = pgEnum("build_status", ["queued", "running", "succeeded", "failed"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "developer", "viewer"]);
export const integrationProviderEnum = pgEnum("integration_provider", [
  "github",
  "cloudflare",
  "neon",
  "postman",
  "betterauth",
  "codespaces",
]);

// Organizations table
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 64 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  email: varchar("email", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 64 }),
  roles: varchar("roles").array().notNull().default(["viewer"]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 64 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  defaultBranch: varchar("default_branch", { length: 255 }).notNull().default("main"),
  status: projectStatusEnum("status").notNull().default("provisioning"),
  integrations: jsonb("integrations"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Environments table
export const environments = pgTable("environments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  name: varchar("name", { length: 64 }).notNull(),
  kind: environmentKindEnum("kind").notNull(),
  githubBranch: varchar("github_branch", { length: 255 }).notNull(),
  cloudflareUrl: varchar("cloudflare_url", { length: 512 }),
  neonBranchId: varchar("neon_branch_id", { length: 255 }),
  postmanEnvironmentId: varchar("postman_environment_id", { length: 255 }),
    // T032: GitHub Secrets Sync fields
    githubEnvironmentId: integer("github_environment_id"),
    secretsLastSyncedAt: timestamp("secrets_last_synced_at"),
    syncStatus: varchar("sync_status", { length: 20 }),
  lastDeploymentId: uuid("last_deployment_id"),
  ttlExpiresAt: timestamp("ttl_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Integration configs table
export const integrationConfigs = pgTable("integration_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  provider: integrationProviderEnum("provider").notNull(),
  config: jsonb("config").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Deployments table
export const deployments = pgTable("deployments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  environmentId: uuid("environment_id")
    .notNull()
    .references(() => environments.id),
  sourceCommitSha: varchar("source_commit_sha", { length: 40 }).notNull(),
  providerIds: jsonb("provider_ids"),
  status: deploymentStatusEnum("status").notNull(),
  preview: varchar("preview", { length: 10 }).notNull().default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Type exports
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Environment = typeof environments.$inferSelect;
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;

