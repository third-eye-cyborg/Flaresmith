import { pgTable, uuid, timestamp, varchar, integer, boolean, text } from "drizzle-orm/pg-core";
import { users } from "./base";

/**
 * T022: MCPToolInvocation schema FR-061
 */
export const mcpToolInvocations = pgTable("mcp_tool_invocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  toolName: varchar("tool_name", { length: 128 }).notNull(),
  serverName: varchar("server_name", { length: 128 }).notNull(),
  actorType: varchar("actor_type", { length: 16 }).notNull(), // admin|user|system
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  durationMs: integer("duration_ms").notNull(),
  success: boolean("success").notNull(),
  errorCode: varchar("error_code", { length: 64 }),
  correlationId: uuid("correlation_id").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  resourceRef: text("resource_ref"),
  rateLimitApplied: boolean("rate_limit_applied").notNull().default(false),
});

export type MCPToolInvocation = typeof mcpToolInvocations.$inferSelect;
