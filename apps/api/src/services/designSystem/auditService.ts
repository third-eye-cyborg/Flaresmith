/**
 * T012 & T014: Base Design System Service & Audit Service
 * Feature: 004-design-system
 * 
 * Base service class with retry logic and audit logging for design system operations.
 */

import type { Context } from 'hono';

/**
 * Audit event types for design system operations
 */
export type DesignAuditEventType =
  | 'design.override.submitted'
  | 'design.override.applied'
  | 'design.override.rejected'
  | 'design.tokens.version.created'
  | 'design.tokens.rollback.completed'
  | 'design.drift.detected'
  | 'design.accessibility.audit.completed'
  | 'design.tokens.retrieved'
  | 'design.component.variant.created'
  | 'design.component.variant.updated';

/**
 * Audit event payload
 */
export interface DesignAuditEvent {
  type: DesignAuditEventType;
  actor?: string; // User ID
  correlationId?: string;
  projectId?: string;
  environment?: string;
  version?: number;
  metadata?: Record<string, unknown>;
  durationMs?: number;
}

/**
 * Base service class for design system operations
 */
export class BaseDesignSystemService {
  /**
   * Log design system audit event
   * 
   * @param event - Audit event
   */
  protected async logAuditEvent(event: DesignAuditEvent): Promise<void> {
    console.log('[DesignSystem Audit]', {
      timestamp: new Date().toISOString(),
      ...event,
    });
    
    // TODO: Integrate with structured logging service
    // TODO: Store in audit_events table
  }

  /**
   * Execute operation with retry logic
   * 
   * @param operation - Operation to execute
   * @param maxRetries - Maximum number of retries (default: 3)
   * @param baseDelay - Base delay in ms (default: 1000)
   * @returns Operation result
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt);
          const jitter = Math.random() * delay * 0.2; // ±20% jitter
          const totalDelay = delay + jitter;
          
          console.warn(
            `[DesignSystem] Operation failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${Math.round(totalDelay)}ms...`,
            { error: lastError.message }
          );
          
          await new Promise((resolve) => setTimeout(resolve, totalDelay));
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Extract correlation ID from request context
   * 
   * @param c - Hono context
   * @returns Correlation ID
   */
  protected getCorrelationId(c: Context): string {
    return c.get('correlationId') || c.get('requestId') || 'unknown';
  }

  /**
   * Extract actor ID from request context
   * 
   * @param c - Hono context
   * @returns User ID or 'system'
   */
  protected getActorId(c: Context): string {
    const user = c.get('user');
    return user?.id || 'system';
  }

  /**
   * Measure operation duration
   * 
   * @param operation - Operation to measure
   * @returns Result and duration in ms
   */
  protected async measure<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; durationMs: number }> {
    const start = Date.now();
    const result = await operation();
    const durationMs = Date.now() - start;
    
    return { result, durationMs };
  }
}

/**
 * Audit service for design system events
 */
export class DesignAuditService extends BaseDesignSystemService {
  /**
   * Log override submitted event
   */
  async logOverrideSubmitted(params: {
    correlationId: string;
    actor: string;
    projectId: string;
    environment: string;
    sizePct: number;
    diffHash: string;
  }): Promise<void> {
    await this.logAuditEvent({
      type: 'design.override.submitted',
      actor: params.actor,
      correlationId: params.correlationId,
      projectId: params.projectId,
      environment: params.environment,
      metadata: {
        sizePct: params.sizePct,
        diffHash: params.diffHash,
      },
    });
  }

  /**
   * Log override applied event
   */
  async logOverrideApplied(params: {
    correlationId: string;
    actor: string;
    projectId: string;
    environment: string;
    version: number;
    durationMs: number;
  }): Promise<void> {
    await this.logAuditEvent({
      type: 'design.override.applied',
      actor: params.actor,
      correlationId: params.correlationId,
      projectId: params.projectId,
      environment: params.environment,
      version: params.version,
      durationMs: params.durationMs,
    });
  }

  /**
   * Log override rejected event
   */
  async logOverrideRejected(params: {
    correlationId: string;
    actor: string;
    projectId: string;
    environment: string;
    reason: string;
  }): Promise<void> {
    await this.logAuditEvent({
      type: 'design.override.rejected',
      actor: params.actor,
      correlationId: params.correlationId,
      projectId: params.projectId,
      environment: params.environment,
      metadata: { reason: params.reason },
    });
  }

  /**
   * Log token version created event
   */
  async logTokenVersionCreated(params: {
    correlationId: string;
    actor: string;
    version: number;
    hash: string;
  }): Promise<void> {
    await this.logAuditEvent({
      type: 'design.tokens.version.created',
      actor: params.actor,
      correlationId: params.correlationId,
      version: params.version,
      metadata: { hash: params.hash },
    });
  }

  /**
   * Log rollback completed event
   */
  async logRollbackCompleted(params: {
    correlationId: string;
    actor: string;
    previousVersion: number;
    targetVersion: number;
    newVersion?: number;
    rationale?: string;
    durationMs: number;
  }): Promise<void> {
    await this.logAuditEvent({
      type: 'design.tokens.rollback.completed',
      actor: params.actor,
      correlationId: params.correlationId,
      metadata: {
        previousVersion: params.previousVersion,
        targetVersion: params.targetVersion,
        newVersion: params.newVersion,
        rationale: params.rationale,
      },
      durationMs: params.durationMs,
    });
  }

  /**
   * Log drift detected event
   */
  async logDriftDetected(params: {
    correlationId: string;
    baselineVersion: number;
    currentHash: string;
    driftSummary: string;
  }): Promise<void> {
    await this.logAuditEvent({
      type: 'design.drift.detected',
      correlationId: params.correlationId,
      version: params.baselineVersion,
      metadata: {
        currentHash: params.currentHash,
        summary: params.driftSummary,
      },
    });
  }

  /**
   * Log accessibility audit completed event
   */
  async logAccessibilityAuditCompleted(params: {
    correlationId: string;
    version: number;
    mode: string;
    passedPct: number;
    durationMs: number;
  }): Promise<void> {
    await this.logAuditEvent({
      type: 'design.accessibility.audit.completed',
      correlationId: params.correlationId,
      version: params.version,
      metadata: {
        mode: params.mode,
        passedPct: params.passedPct,
      },
      durationMs: params.durationMs,
    });
  }
}
