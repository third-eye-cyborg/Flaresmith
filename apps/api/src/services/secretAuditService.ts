// T153: Secret Audit Logging Service (with metrics emission T156)
import { getDb } from '../../db/connection';
import { secretAudit } from '../../db/schema/secrets';
import { incrementCounter, METRICS } from '../lib/metrics';
import { eq } from 'drizzle-orm';

export type SecretAuditOperation = 'read' | 'update' | 'rotate';

export interface LogSecretAuditParams {
  projectId: string;
  environmentId: string;
  secretName: string;
  // hashed reference of secret identity (sha256 hex string recommended)
  secretRefHash: string;
  operation: SecretAuditOperation;
  origin?: 'user' | 'system';
  actorId?: string; // MUST be provided if origin=user
  metadata?: Record<string, any>;
}

export async function logSecretAudit(params: LogSecretAuditParams) {
  const db = getDb();
  const origin = params.origin ?? (params.actorId ? 'user' : 'system');
  if (origin === 'user' && !params.actorId) {
    throw new Error('actorId required when origin=user');
  }
  await db.insert(secretAudit).values({
    projectId: params.projectId,
    environmentId: params.environmentId,
    secretName: params.secretName,
    secretRefHash: params.secretRefHash,
    operation: params.operation,
    origin,
    actorId: params.actorId,
    metadata: params.metadata ?? {},
  });
  incrementCounter(METRICS.secretAccessTotal);
  if (params.operation === 'rotate') {
    incrementCounter(METRICS.keyRotationTotal);
  }
}

export async function listSecretAudit(projectId: string, environmentId: string, limit = 50) {
  const db = getDb();
  return db.query.secretAudit.findMany({
    where: (rows, { eq }) => eq(rows.projectId, projectId),
    limit,
    orderBy: (rows, { desc }) => desc(rows.occurredAt)
  });
}
