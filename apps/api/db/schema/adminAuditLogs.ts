import { pgTable, uuid, timestamp, text, jsonb, varchar } from "drizzle-orm/pg-core";
import { users } from "./base";

/**
 * T018: AdminAuditLog schema FR-016
 */
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").references(() => users.id, { onDelete: "set null" }),
  actionType: varchar("action_type", { length: 64 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: text("entity_id"),
  changesJson: jsonb("changes_json"),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
