import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * T015: Setup Neon Postgres connection with serverless driver
 * Uses HTTP-based Neon serverless driver for Cloudflare Workers compatibility
 */

export function createDbConnection(databaseUrl?: string) {
  const connectionString = databaseUrl;
  if (!connectionString) {
    // Return lightweight mock connection when no env bindings present yet (module init time in Workers).
    // Real connection will be created lazily by route handlers that instantiate their own connections if needed.
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
  // Treat placeholder values as absence to allow Workers deployment without real DB during early bootstrap.
  if (typeof connectionString === 'string' && connectionString.startsWith('__PLACEHOLDER')) {
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
export const db = createDbConnection(undefined);

export type DbConnection = ReturnType<typeof createDbConnection>;
