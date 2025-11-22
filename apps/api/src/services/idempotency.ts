import { Context } from "hono";
import { createHash } from "crypto";
import { getDb } from "../db/connection";
import { idempotencyKeys } from "../db/schema/idempotency";
import { eq } from "drizzle-orm";

/**
 * T028: Idempotency Service
 * Implements convergent provisioning with deterministic keys
 */

export interface IdempotencyCheckResult {
  exists: boolean;
  resourceId?: string;
  lastStatus?: string;
  checksumMatch?: boolean;
}

export class IdempotencyService {
  constructor(private databaseUrl: string) {}

  async checkKey(
    key: string,
    payload: Record<string, unknown>
  ): Promise<IdempotencyCheckResult> {
    const db = getDb(this.databaseUrl);
    const checksum = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");

    const existing = await db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .limit(1);

    if (existing.length === 0) {
      return { exists: false };
    }

    const record = existing[0];
    return {
      exists: true,
      resourceId: record.resourceId || undefined,
      lastStatus: record.lastStatus,
      checksumMatch: record.checksum === checksum,
    };
  }

  async storeKey(
    key: string,
    payload: Record<string, unknown>,
    resourceType: string
  ): Promise<void> {
    const db = getDb(this.databaseUrl);
    const checksum = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");

    await db.insert(idempotencyKeys).values({
      key,
      resourceType,
      lastStatus: "pending",
      checksum,
    });
  }

  async updateKey(
    key: string,
    status: string,
    resourceId?: string
  ): Promise<void> {
    const db = getDb(this.databaseUrl);

    await db
      .update(idempotencyKeys)
      .set({
        lastStatus: status,
        resourceId: resourceId || null,
        updatedAt: new Date(),
      })
      .where(eq(idempotencyKeys.key, key));
  }
}

export function createIdempotencyService(c: Context): IdempotencyService {
  return new IdempotencyService(c.env.DATABASE_URL);
}
