import { pgTable, uuid, timestamp, text } from "drizzle-orm/pg-core";

/**
 * T025: StreamPlaybackDeny schema FR-064/FR-065 (denylist for revoked tokens)
 */
export const streamPlaybackDeny = pgTable("stream_playback_deny", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenId: text("token_id").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StreamPlaybackDeny = typeof streamPlaybackDeny.$inferSelect;
