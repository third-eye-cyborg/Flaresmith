import { pgTable, uuid, timestamp, text, pgEnum, varchar } from "drizzle-orm/pg-core";
import { users } from "./base";

/**
 * T016: UserSession schema
 * Standard user sessions (Better Auth) enriched with billing context (FR-005).
 */
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "pro", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "canceled", "past_due", "trialing"]);

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  polarCustomerId: varchar("polar_customer_id", { length: 255 }).notNull(),
  subscriptionTier: subscriptionTierEnum("subscription_tier").notNull().default("free"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("trialing"),
});

export type UserSession = typeof userSessions.$inferSelect;
