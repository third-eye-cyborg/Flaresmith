import { BaseGitHubService } from './baseGitHubService';
import type { Octokit } from '@octokit/rest';
import { eq, inArray } from 'drizzle-orm';
import { secretMappings, type SecretMapping } from '../../../db/schema/secretSync';
import { GitHubAuditService } from './auditService';
import type { DbConnection } from '../../../db/connection';
import { v4 as uuidv4 } from 'uuid';

/**
 * T045-T049: Secret Validation Service
 * Provides validation of secret presence and conflict detection across scopes
 * Note: GitHub API does not expose plaintext secret values; conflict detection leverages stored hashes and sync status.
 */

export interface SecretValidationInput {
  projectId: string;
  requiredSecrets?: string[]; // If omitted, infer from secret_mappings
  targetScopes?: Array<'codespaces' | 'dependabot'>; // default both
  actorId: string;
  correlationId?: string;
}

export interface MissingSecretEntry {
  secretName: string;
  scope: string;
}

export interface ConflictEntry {
  secretName: string;
  scopes: string[];
  valueHashes: Record<string, string>; // scope => hash (actions only currently)
}

export interface SecretValidationResult {
  valid: boolean;
  missing: MissingSecretEntry[];
  conflicts: ConflictEntry[];
  summary: {
    totalSecrets: number;
    missingCount: number;
    conflictCount: number;
    validCount: number;
  };
  remediationSteps: string[];
  correlationId: string;
  durationMs: number;
}

export class SecretValidationService extends BaseGitHubService {
  private db: DbConnection;
  private auditService: GitHubAuditService;

  constructor(octokit: Octokit, db: DbConnection) {
    super(octokit);
    this.db = db;
    this.auditService = new GitHubAuditService(db);
  }

  /**
   * T045: Validate secrets across target scopes
   */
  async validateSecrets(input: SecretValidationInput): Promise<SecretValidationResult> {
    const start = Date.now();
    const correlationId = input.correlationId || uuidv4();
    const targetScopes = input.targetScopes || ['codespaces', 'dependabot'];

    // T046: Retrieve source-of-truth secrets (Actions scope) from mapping table
    const mappings = await this.getSecretMappings(input.projectId, input.requiredSecrets);

    // Infer required secrets if not provided
    const required = input.requiredSecrets || mappings.map(m => m.secretName);

    // T047: Detect missing secrets
    const missing = this.findMissingSecrets(mappings, required, targetScopes);

    // T048: Detect conflicts
    const conflicts = this.detectConflicts(mappings, required, targetScopes);

    // T049: Generate remediation steps
    const remediationSteps = this.generateRemediationSteps(missing, conflicts);

    const result: SecretValidationResult = {
      valid: missing.length === 0 && conflicts.length === 0,
      missing,
      conflicts,
      summary: {
        totalSecrets: required.length,
        missingCount: missing.length,
        conflictCount: conflicts.length,
        validCount: required.length - missing.length - conflicts.length,
      },
      remediationSteps,
      correlationId,
      durationMs: Date.now() - start,
    };

    // Audit log (operation=validate)
    await this.auditService.logSecretSyncEvent({
      projectId: input.projectId,
      actorId: input.actorId,
      operation: 'validate',
      affectedScopes: targetScopes,
      status: result.valid ? 'success' : (missing.length > 0 && conflicts.length > 0 ? 'partial' : 'failure'),
      successCount: result.summary.validCount,
      failureCount: missing.length + conflicts.length,
      correlationId,
      durationMs: result.durationMs,
      metadata: {
        missingCount: missing.length,
        conflictCount: conflicts.length,
      },
    });

    return result;
  }

  /**
   * T046: Retrieve secret mappings optionally filtered by specific secret names
   */
  private async getSecretMappings(projectId: string, secretNames?: string[]): Promise<SecretMapping[]> {
    if (secretNames && secretNames.length > 0) {
      return this.db
        .select()
        .from(secretMappings)
        .where(eq(secretMappings.projectId, projectId))
        .where(inArray(secretMappings.secretName, secretNames));
    }
    return this.db.select().from(secretMappings).where(eq(secretMappings.projectId, projectId));
  }

  /**
   * T047: Find missing secrets in target scopes
   */
  private findMissingSecrets(
    mappings: SecretMapping[],
    required: string[],
    targetScopes: string[]
  ): MissingSecretEntry[] {
    const missing: MissingSecretEntry[] = [];
    for (const secretName of required) {
      const mapping = mappings.find(m => m.secretName === secretName);
      if (!mapping) {
        // Entire secret missing from source scope (Actions)
        for (const scope of targetScopes) {
          missing.push({ secretName, scope });
        }
        continue;
      }
      for (const scope of targetScopes) {
        if (!mapping.targetScopes.includes(scope)) {
          missing.push({ secretName, scope });
        }
      }
    }
    return missing;
  }

  /**
   * T048: Detect conflicts (placeholder logic due to single valueHash storage)
   * Marks secrets as conflict if mapping.syncStatus === 'conflict'
   */
  private detectConflicts(
    mappings: SecretMapping[],
    required: string[],
    targetScopes: string[]
  ): ConflictEntry[] {
    const conflicts: ConflictEntry[] = [];
    for (const secretName of required) {
      const mapping = mappings.find(m => m.secretName === secretName);
      if (!mapping) continue;
      if (mapping.syncStatus === 'conflict') {
        conflicts.push({
          secretName,
          scopes: ['actions', ...targetScopes],
          valueHashes: { actions: mapping.valueHash },
        });
      }
    }
    return conflicts;
  }

  /**
   * T049: Generate remediation steps based on missing and conflicts
   */
  private generateRemediationSteps(
    missing: MissingSecretEntry[],
    conflicts: ConflictEntry[]
  ): string[] {
    const steps: string[] = [];
    const missingBySecret: Record<string, string[]> = {};
    for (const m of missing) {
      if (!missingBySecret[m.secretName]) {
        missingBySecret[m.secretName] = [];
      }
      missingBySecret[m.secretName]!.push(m.scope);
    }

    for (const [secret, scopes] of Object.entries(missingBySecret)) {
      steps.push(`Add secret ${secret} to scopes: ${scopes.join(', ')}`);
    }

    for (const conflict of conflicts) {
      steps.push(`Resolve conflict for ${conflict.secretName}: re-run secret sync with force=true to overwrite target scopes.`);
    }

    if (steps.length === 0) {
      steps.push('All secrets valid. No action required.');
    }

    return steps;
  }
}
