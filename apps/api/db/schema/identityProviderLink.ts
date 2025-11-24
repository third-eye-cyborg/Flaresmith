import { pgEnum, pgTable, uuid, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { users } from "./base";

// FR-003: Identity provider linkages for user accounts
export const authProviderEnum = pgEnum("auth_provider", ["apple", "google", "github", "password"]);

export const identityProviderLinks = pgTable("identity_provider_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: authProviderEnum("provider").notNull(),
  subject: text("subject").notNull(), // provider user id / sub
  emailAtProvider: varchar("email_at_provider", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IdentityProviderLink = typeof identityProviderLinks.$inferSelect;
