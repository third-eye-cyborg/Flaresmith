import { pgTable, uuid, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";

/**
 * T024: DriftSnapshot schema FR-062
 */
export const mcpDriftSnapshots = pgTable("mcp_drift_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  serverName: varchar("server_name", { length: 128 }).notNull(),
  diffJson: jsonb("diff_json").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  status: varchar("status", { length: 16 }).notNull().default("detected"), // detected|resolved
});

export type MCPDriftSnapshot = typeof mcpDriftSnapshots.$inferSelect;
