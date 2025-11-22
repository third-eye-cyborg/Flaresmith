import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getEnv } from "@cloudmake/utils";
import * as schema from "./schema";

/**
 * T015: Setup Neon Postgres connection with serverless driver
 * Uses HTTP-based Neon serverless driver for Cloudflare Workers compatibility
 */

export function createDbConnection(databaseUrl?: string) {
  const connectionString = databaseUrl || getEnv("DATABASE_URL");
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export function getDb(databaseUrl: string) {
  return createDbConnection(databaseUrl);
}

export type DbConnection = ReturnType<typeof createDbConnection>;
