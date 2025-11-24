import { drizzle } from "drizzle-orm/neon-http";
import { secretSyncEvents } from "../../db/schema/secretSync";
import { v4 as uuidv4 } from "uuid";

/**
 * T013: Audit service with method logSecretSyncEvent() to insert into secret_sync_events table
 * Source: specs/002-github-secrets-sync/data-model.md
 */

export interface LogSecretSyncEventInput {
  projectId: string;
  actorId: string;
  operation: "create" | "update" | "delete" | "sync_all" | "validate";
  secretName?: string;
  affectedScopes: string[];
  status: "success" | "failure" | "partial";
  successCount: number;
  failureCount: number;
  errorMessage?: string;
  correlationId?: string;
  durationMs: number;
  metadata?: Record<string, any>;
}

export class GitHubAuditService {
  private db: ReturnType<typeof drizzle>;

  constructor(dbConnectionString: string) {
    this.db = drizzle(dbConnectionString);
  }

  /**
   * Log secret synchronization event to audit table
   */
  async logSecretSyncEvent(input: LogSecretSyncEventInput): Promise<void> {
    const correlationId = input.correlationId || uuidv4();

    await this.db.insert(secretSyncEvents).values({
      projectId: input.projectId,
      actorId: input.actorId,
      operation: input.operation,
      secretName: input.secretName,
      affectedScopes: input.affectedScopes,
      status: input.status,
      successCount: input.successCount,
      failureCount: input.failureCount,
      errorMessage: input.errorMessage,
      correlationId,
      durationMs: input.durationMs,
      metadata: input.metadata,
      createdAt: new Date(),
    });
  }

  /**
   * Generate correlation ID for linking related operations
   */
  generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Query audit events for a project
   */
  async getProjectAuditEvents(
    projectId: string,
    limit: number = 100
  ): Promise<Array<typeof secretSyncEvents.$inferSelect>> {
    return await this.db
      .select()
      .from(secretSyncEvents)
      .where(eq(secretSyncEvents.projectId, projectId))
      .orderBy(desc(secretSyncEvents.createdAt))
      .limit(limit);
  }

  /**
   * Query audit events by correlation ID
   */
  async getEventsByCorrelationId(
    correlationId: string
  ): Promise<Array<typeof secretSyncEvents.$inferSelect>> {
    return await this.db
      .select()
      .from(secretSyncEvents)
      .where(eq(secretSyncEvents.correlationId, correlationId))
      .orderBy(desc(secretSyncEvents.createdAt));
  }
}

// Helper imports for Drizzle queries
import { eq, desc } from "drizzle-orm";
