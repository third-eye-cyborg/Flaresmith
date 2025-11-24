import { pgTable, uuid, timestamp, varchar, integer, date, numeric } from "drizzle-orm/pg-core";

/**
 * T023: MCPServerMetric schema FR-077
 */
export const mcpServerMetrics = pgTable("mcp_server_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  serverName: varchar("server_name", { length: 128 }).notNull(),
  date: date("date").notNull(),
  p95LatencyMs: integer("p95_latency_ms").notNull(),
  errorRatePct: numeric("error_rate_pct", { precision: 5, scale: 2 }).notNull(),
  seqLatencyMs: integer("seq_latency_ms"),
  parallelLatencyMs: integer("parallel_latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MCPServerMetric = typeof mcpServerMetrics.$inferSelect;
