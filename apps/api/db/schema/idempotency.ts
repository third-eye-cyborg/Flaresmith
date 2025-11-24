import { pgTable, uuid, varchar, timestamp, text } from "drizzle-orm/pg-core";

/**
 * T027: Create idempotency tracking table schema
 * Enables convergent provisioning operations
 */

export const idempotencyKeys = pgTable("idempotency_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  resourceType: varchar("resource_type", { length: 64 }).notNull(),
  resourceId: uuid("resource_id"),
  lastStatus: varchar("last_status", { length: 32 }).notNull(),
  checksum: text("checksum").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
