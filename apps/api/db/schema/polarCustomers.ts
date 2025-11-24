import { pgTable, uuid, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./base";

/**
 * T017: PolarCustomer schema (billing linkage for standard users) FR-005
 */
export const polarCustomers = pgTable("polar_customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  polarCustomerId: varchar("polar_customer_id", { length: 255 }).notNull(),
  subscriptionTier: varchar("subscription_tier", { length: 32 }).notNull(),
  subscriptionStatus: varchar("subscription_status", { length: 32 }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PolarCustomer = typeof polarCustomers.$inferSelect;
