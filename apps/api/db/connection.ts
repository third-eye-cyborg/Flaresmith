import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getEnv } from "@cloudmake/utils";
import * as schema from "./schema";

/**
 * T015: Setup Neon Postgres connection with serverless driver
 * Uses HTTP-based Neon serverless driver for Cloudflare Workers compatibility
 */

export function createDbConnection(databaseUrl?: string) {
  const isTest = process.env.NODE_ENV === 'test';
  const connectionString = databaseUrl || process.env.DATABASE_URL;
  if (!connectionString) {
    if (isTest) {
      // Provide a lightweight mock to avoid throwing in test suites that import modules with implicit db usage.
      const mock: any = {
        execute: async () => ({ rows: [] }),
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: async () => []
              })
            })
          })
        })
      };
      return mock;
    }
    // Non-test environment: enforce presence
    const required = getEnv("DATABASE_URL");
    const sql = neon(required);
    return drizzle(sql, { schema });
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export function getDb(databaseUrl: string) {
  return createDbConnection(databaseUrl);
}

/**
 * Default shared connection instance.
 * Many existing route implementations import `db` directly; previously this was missing
 * causing runtime errors. Exporting it here preserves backward compatibility while allowing
 * tests to still construct isolated connections via `createDbConnection`.
 */
export const db = createDbConnection();

export type DbConnection = ReturnType<typeof createDbConnection>;
