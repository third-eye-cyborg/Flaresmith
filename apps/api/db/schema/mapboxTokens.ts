import { pgTable, uuid, timestamp, varchar, text } from "drizzle-orm/pg-core";
import { users } from "./base";

/**
 * T019: MapboxToken schema FR-070/FR-071
 */
export const mapboxTokens = pgTable("mapbox_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  prefix: varchar("prefix", { length: 6 }).notNull(),
  suffix: varchar("suffix", { length: 4 }).notNull(),
  scopes: text("scopes").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MapboxToken = typeof mapboxTokens.$inferSelect;
