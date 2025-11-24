import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, integer, boolean, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { projects, users, environments } from "./base";

/**
 * T001: Create database schema for unified cross-platform design system
 * Feature: 004-design-system
 * Defines tables for design tokens, versions, overrides, audits, and drift detection
 */

// Enums
export const tokenCategoryEnum = pgEnum("token_category", [
  "color",
  "spacing",
  "typography",
  "radius",
  "elevation",
  "glass",
  "semantic",
]);

export const overrideStatusEnum = pgEnum("override_status", [
  "submitted",
  "auto-applied",
  "pending-approval",
  "approved",
  "rejected",
  "archived",
]);

export const themeModeEnum = pgEnum("theme_mode", ["light", "dark"]);

export const accessibilityStatusEnum = pgEnum("accessibility_status", ["pass", "warn", "fail"]);

// Design Tokens table
export const designTokens = pgTable(
  "design_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: tokenCategoryEnum("category").notNull(),
    value: jsonb("value").notNull(),
    accessibilityMeta: jsonb("accessibility_meta"),
    version: integer("version").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: uniqueIndex("design_tokens_name_idx").on(table.name),
  })
);

// Design Token Version Snapshots table
export const designTokenVersions = pgTable(
  "design_token_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    hash: text("hash").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    hashIdx: uniqueIndex("design_token_versions_hash_idx").on(table.hash),
    versionIdx: index("design_token_versions_version_idx").on(table.version),
  })
);

// Theme Overrides table
export const themeOverrides = pgTable(
  "theme_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    environment: varchar("environment", { length: 20 }).notNull(),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id),
    status: overrideStatusEnum("status").notNull().default("submitted"),
    sizePct: integer("size_pct").notNull(),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    tokenDiff: jsonb("token_diff").notNull(),
    approvedBy: uuid("approved_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    projectEnvStatusIdx: index("theme_overrides_project_env_status_idx").on(
      table.projectId,
      table.environment,
      table.status
    ),
  })
);

// Component Variants table
export const componentVariants = pgTable("component_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  component: text("component").notNull(),
  variant: text("variant").notNull(),
  tokensUsed: jsonb("tokens_used").notNull(),
  accessibilityStatus: accessibilityStatusEnum("accessibility_status").notNull().default("pass"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Accessibility Audit Results table
export const accessibilityAuditResults = pgTable(
  "accessibility_audit_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: integer("version").notNull(),
    mode: themeModeEnum("mode").notNull(),
    report: jsonb("report").notNull(),
    passedPct: integer("passed_pct").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    versionModeIdx: index("accessibility_audit_results_version_mode_idx").on(table.version, table.mode),
  })
);

// Design Drift Events table
export const designDriftEvents = pgTable(
  "design_drift_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    baselineVersion: integer("baseline_version").notNull(),
    currentHash: text("current_hash").notNull(),
    diff: jsonb("diff").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    baselineVersionIdx: index("design_drift_events_baseline_version_idx").on(table.baselineVersion),
  })
);

// Type exports
export type DesignToken = typeof designTokens.$inferSelect;
export type DesignTokenVersion = typeof designTokenVersions.$inferSelect;
export type ThemeOverride = typeof themeOverrides.$inferSelect;
export type ComponentVariant = typeof componentVariants.$inferSelect;
export type AccessibilityAuditResult = typeof accessibilityAuditResults.$inferSelect;
export type DesignDriftEvent = typeof designDriftEvents.$inferSelect;

export type NewDesignToken = typeof designTokens.$inferInsert;
export type NewDesignTokenVersion = typeof designTokenVersions.$inferInsert;
export type NewThemeOverride = typeof themeOverrides.$inferInsert;
export type NewComponentVariant = typeof componentVariants.$inferInsert;
export type NewAccessibilityAuditResult = typeof accessibilityAuditResults.$inferInsert;
export type NewDesignDriftEvent = typeof designDriftEvents.$inferInsert;
