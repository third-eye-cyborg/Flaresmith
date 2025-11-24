import { pgTable, uuid, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { users } from "./base";

/**
 * T020: NotificationSegment schema FR-066
 */
export const notificationSegments = pgTable("notification_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  description: varchar("description", { length: 255 }),
  criterionJson: jsonb("criterion_json").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationSegment = typeof notificationSegments.$inferSelect;
