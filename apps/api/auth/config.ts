import { betterAuth } from "better-auth";
import { createDbConnection } from "../db/connection";

/**
 * T018: BetterAuth Configuration
 * Implements JWT-based authentication with session management
 */

export function createAuthConfig(env: {
  DATABASE_URL: string;
  JWT_SECRET: string;
  BASE_URL: string;
}) {
  const db = createDbConnection(env.DATABASE_URL);

  return betterAuth({
    database: db as any,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // TODO: Enable for production
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
      secret: env.JWT_SECRET,
    },
    baseURL: env.BASE_URL,
    trustedOrigins: [env.BASE_URL],
  });
}

export type Auth = ReturnType<typeof createAuthConfig>;
