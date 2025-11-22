import { pgTable, uuid, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { projects } from "./base";

/**
 * T096: ChatSession Drizzle model schema
 * Stores chat session metadata for editor/chat integration
 */
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  branch: varchar("branch", { length: 255 }).notNull(),
  baseCommitSha: varchar("base_commit_sha", { length: 40 }),
  headCommitSha: varchar("head_commit_sha", { length: 40 }),
  status: varchar("status", { length: 20 })
    .notNull()
    .$type<"active" | "closed">()
    .default("active"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
