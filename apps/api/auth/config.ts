import { betterAuth } from "better-auth";
import { createDbConnection } from "../db/connection";

/**
 * T018: BetterAuth Configuration
 * Implements JWT-based authentication with session management
 */

export function createAuthConfig(env: {
  DATABASE_URL: string;
  BETTERAUTH_SECRET: string; // library secret for sessions / internal encryption
  JWT_SIGNING_KEY: string;   // signing key for JWT access tokens
  BASE_URL: string;
}) {
  const db = createDbConnection(env.DATABASE_URL);

  return betterAuth({
    // Drizzle (Neon HTTP) connection – BetterAuth expects a database-like adapter
    database: db as any,
    // Top-level secret (some BetterAuth features use this separate from JWT signing)
    secret: env.BETTERAUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // TODO: Enable for production rollout
    },
    session: {
      expiresIn: 60 * 60 * 24, // 24 hours
      updateAge: 60 * 60, // 1 hour
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
    jwt: {
      expiresIn: 60 * 15, // 15 minutes
      secret: env.JWT_SIGNING_KEY,
    },
    baseURL: env.BASE_URL,
    trustedOrigins: [env.BASE_URL],
  });
}

export type Auth = ReturnType<typeof createAuthConfig>;
