import { pgTable, uuid, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { authProviderEnum } from "./identityProviderLink";

// FR-005: OAuth state storage (short-lived) for PKCE
export const oauthState = pgTable("oauth_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  state: text("state").notNull().unique(),
  codeVerifier: text("code_verifier").notNull(),
  provider: authProviderEnum("provider").notNull(),
  redirectUri: varchar("redirect_uri", { length: 512 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OAuthState = typeof oauthState.$inferSelect;
