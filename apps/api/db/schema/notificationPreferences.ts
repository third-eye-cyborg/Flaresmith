import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { users } from "./base";

/**
 * T021: NotificationPreference schema FR-066
 */
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  segmentsSubscribed: uuid("segments_subscribed").array().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
