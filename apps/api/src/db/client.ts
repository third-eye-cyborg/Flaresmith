// Compatibility re-export shim for legacy imports expecting src/db/client
// Delegates to root db/connection which sets up Neon Drizzle instance.
export { db, createDbConnection, getDb } from '../../db/connection';
