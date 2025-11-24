import { pgTable, uuid, timestamp, text, varchar } from "drizzle-orm/pg-core";
import { users } from "./base";

/**
 * T016: AdminSession schema
 * Represents authenticated admin sessions (Neon Auth) per FR-001/FR-002.
 * Token value stored as hash for security; IP & UA captured for audit (FR-016).
 */
export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
});

export type AdminSession = typeof adminSessions.$inferSelect;
