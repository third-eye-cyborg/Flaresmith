import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./project";
import { environments } from "./environment";

export const builds = pgTable("builds", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  environmentId: uuid("environment_id")
    .notNull()
    .references(() => environments.id, { onDelete: "cascade" }),
  commitSha: varchar("commit_sha", { length: 40 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().$type<"queued" | "running" | "succeeded" | "failed">(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Build = typeof builds.$inferSelect;
export type NewBuild = typeof builds.$inferInsert;
