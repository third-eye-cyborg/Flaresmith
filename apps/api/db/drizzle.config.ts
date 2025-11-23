import type { Config } from "drizzle-kit";
import { getEnv } from "@flaresmith/utils";

/**
 * T016: Initialize Drizzle ORM configuration and migration system
 */

export default {
  schema: "./db/schema/*.ts",
  out: "./db/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: getEnv("DATABASE_URL"),
  },
  verbose: true,
  strict: true,
} satisfies Config;
