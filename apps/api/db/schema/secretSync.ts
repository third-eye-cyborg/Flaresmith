import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  integer,
  boolean,
  text,
  pgEnum,
  char,
  check,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, users } from "./base";

/**
 * T001: Database schema for GitHub secrets synchronization
 * Source: specs/002-github-secrets-sync/data-model.md
 */

// Enums
export const secretSyncStatusEnum = pgEnum("secret_sync_status", [
  "pending",
  "synced",
  "failed",
  "conflict",
]);

export const secretSyncOperationEnum = pgEnum("secret_sync_operation", [
  "create",
  "update",
  "delete",
  "sync_all",
  "validate",
]);

export const secretSyncEventStatusEnum = pgEnum("secret_sync_event_status", [
  "success",
  "failure",
  "partial",
]);

export const githubEnvironmentStatusEnum = pgEnum("github_environment_status", [
  "provisioning",
  "active",
  "failed",
]);

export const githubApiQuotaTypeEnum = pgEnum("github_api_quota_type", [
  "core",
  "secrets",
  "graphql",
]);

// T015: SecretMapping table
export const secretMappings = pgTable(
  "secret_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    secretName: varchar("secret_name", { length: 100 }).notNull(),
    valueHash: char("value_hash", { length: 64 }).notNull(),
    sourceScope: varchar("source_scope", { length: 20 }).notNull().default("actions"),
    targetScopes: text("target_scopes").array().notNull(),
    isExcluded: boolean("is_excluded").notNull().default(false),
    lastSyncedAt: timestamp("last_synced_at"),
    syncStatus: secretSyncStatusEnum("sync_status").notNull().default("pending"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    secretNameCheck: check("secret_name_pattern", sql`${table.secretName} ~ '^[A-Z][A-Z0-9_]*$'`),
    uniqueProjectSecret: unique("unique_project_secret").on(table.projectId, table.secretName),
  })
);

// T016: SecretExclusionPattern table
export const secretExclusionPatterns = pgTable(
  "secret_exclusion_patterns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    pattern: varchar("pattern", { length: 200 }).notNull(),
    reason: text("reason").notNull(),
    isGlobal: boolean("is_global").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    globalProjectCheck: check(
      "global_project_constraint",
      sql`(${table.isGlobal} = true AND ${table.projectId} IS NULL) OR (${table.isGlobal} = false AND ${table.projectId} IS NOT NULL)`
    ),
    uniqueProjectPattern: unique("unique_project_pattern").on(table.projectId, table.pattern),
  })
);

// T017: SecretSyncEvent table (partitioned by month)
export const secretSyncEvents = pgTable(
  "secret_sync_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    operation: secretSyncOperationEnum("operation").notNull(),
    secretName: varchar("secret_name", { length: 100 }),
    affectedScopes: text("affected_scopes").array().notNull(),
    status: secretSyncEventStatusEnum("status").notNull(),
    successCount: integer("success_count").notNull().default(0),
    failureCount: integer("failure_count").notNull().default(0),
    errorMessage: text("error_message"),
    correlationId: uuid("correlation_id").notNull(),
    durationMs: integer("duration_ms").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    countCheck: check(
      "count_constraint",
      sql`${table.successCount} + ${table.failureCount} = array_length(${table.affectedScopes}, 1)`
    ),
  })
);

// T031: GitHubEnvironmentConfig table
export const githubEnvironmentConfigs = pgTable(
  "github_environment_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    environmentName: varchar("environment_name", { length: 20 }).notNull(),
    githubEnvironmentId: integer("github_environment_id").notNull(),
    protectionRules: jsonb("protection_rules").notNull(),
    secrets: jsonb("secrets").notNull().default(sql`'[]'::jsonb`),
    linkedResources: jsonb("linked_resources").notNull().default(sql`'{}'::jsonb`),
    status: githubEnvironmentStatusEnum("status").notNull().default("provisioning"),
    lastDeploymentAt: timestamp("last_deployment_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    environmentNameCheck: check(
      "environment_name_constraint",
      sql`${table.environmentName} IN ('dev', 'staging', 'production')`
    ),
    uniqueProjectEnvironment: unique("unique_project_environment").on(
      table.projectId,
      table.environmentName
    ),
  })
);

// GitHubApiQuota table
export const githubApiQuotas = pgTable(
  "github_api_quotas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    quotaType: githubApiQuotaTypeEnum("quota_type").notNull(),
    remaining: integer("remaining").notNull(),
    limitValue: integer("limit_value").notNull(),
    resetAt: timestamp("reset_at").notNull(),
    lastCheckedAt: timestamp("last_checked_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    remainingCheck: check("remaining_constraint", sql`${table.remaining} >= 0`),
    limitCheck: check("limit_constraint", sql`${table.remaining} <= ${table.limitValue}`),
    uniqueProjectQuota: unique("unique_project_quota").on(table.projectId, table.quotaType),
  })
);

// Type exports
export type SecretMapping = typeof secretMappings.$inferSelect;
export type SecretExclusionPattern = typeof secretExclusionPatterns.$inferSelect;
export type SecretSyncEvent = typeof secretSyncEvents.$inferSelect;
export type GitHubEnvironmentConfig = typeof githubEnvironmentConfigs.$inferSelect;
export type GitHubApiQuota = typeof githubApiQuotas.$inferSelect;
