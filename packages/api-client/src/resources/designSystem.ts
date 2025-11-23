import { CloudMakeClient } from "../client";
import {
  GetTokensRequest,
  GetTokensResponse,
  GetComponentVariantsResponse,
  ApplyOverrideRequest,
  ApplyOverrideResponse,
  ThemeOverride,
  RunAccessibilityAuditRequest,
  RunAccessibilityAuditResponse,
  GetLatestAuditResponse,
  DetectDriftResponse,
  RollbackRequest,
  RollbackResponse,
  type DesignTokenCategory,
  type Environment,
  type TokenDiff,
  type ThemeMode,
} from "@flaresmith/types";

/**
 * DesignSystemResource
 * Implements T028, T057: API client methods for design system operations
 */
export class DesignSystemResource {
  constructor(private client: CloudMakeClient) {}

  /**
   * Fetch design tokens with optional filtering
   * @param params Optional filter params (category, version)
   */
  async getTokens(params?: {
    category?: DesignTokenCategory;
    version?: number;
  }): Promise<ReturnType<typeof GetTokensResponse.parse>> {
    const query: Record<string, string> = {};

    if (params?.category) query.category = params.category;
    if (params?.version) query.version = String(params.version);

    const qs = Object.keys(query).length
      ? `?${new URLSearchParams(query).toString()}`
      : "";

    return this.client.get(`/design/tokens${qs}`, GetTokensResponse);
  }

  /**
   * Fetch component variants
   */
  async getComponentVariants(): Promise<{ variants: Array<{ id: string; component: string; variant: string; tokens_used: string[]; accessibility_status: string; created_at: string }>; count: number; meta?: any }> {
    return this.client.get('/design/components/variants', GetComponentVariantsResponse as any);
  }

  /**
   * Submit theme override for validation and application
   * @param params Override submission (environment, diff, rationale)
   * @returns Created override with status (auto-applied, pending-approval, or rejected)
   */
  async submitOverride(params: {
    environment: Environment;
    diff: TokenDiff[];
    rationale?: string;
  }): Promise<ReturnType<typeof ApplyOverrideResponse.parse>> {
    return this.client.post('/design/overrides', params, ApplyOverrideResponse);
  }

  /**
   * Retrieve theme override by ID
   * @param overrideId Override UUID
   * @returns ThemeOverride with full state (status, diff, approval details)
   */
  async getOverride(overrideId: string): Promise<{ override: ThemeOverride }> {
    return this.client.get(`/design/overrides/${overrideId}`, {
      parse: (data: any) => ({
        override: data.override,
      }),
    } as any);
  }

  /**
   * Approve pending theme override (requires platformOwner or designDelegate role)
   * @param overrideId Override UUID
   * @returns Updated override with status=auto-applied
   */
  async approveOverride(overrideId: string): Promise<{ override: { id: string; status: string } }> {
    return this.client.patch(`/design/overrides/${overrideId}/approve`, {}, {
      parse: (data: any) => ({
        override: data.override,
      }),
    } as any);
  }

  /**
   * Run accessibility audit for design tokens
   * @param params Optional audit parameters (mode, focusComponents)
   * @returns Audit job ID and status
   */
  async runAccessibilityAudit(params?: {
    mode?: ThemeMode;
    focusComponents?: string[];
  }): Promise<ReturnType<typeof RunAccessibilityAuditResponse.parse>> {
    return this.client.post('/design/audits/run', params || {}, RunAccessibilityAuditResponse);
  }

  /**
   * Get latest accessibility audit report
   * @param mode Optional theme mode filter (light|dark)
   * @returns Full audit report with contrast ratios and passed percentage
   */
  async getLatestAudit(mode?: ThemeMode): Promise<ReturnType<typeof GetLatestAuditResponse.parse>> {
    const qs = mode ? `?mode=${mode}` : '';
    return this.client.get(`/design/audits/latest${qs}`, GetLatestAuditResponse);
  }

  /**
   * Detect drift between baseline and current tokens
   * @param baselineVersion Optional baseline version (defaults to latest)
   * @returns Drift summary by category and hasDrift flag
   */
  async detectDrift(baselineVersion?: number): Promise<ReturnType<typeof DetectDriftResponse.parse>> {
    const qs = baselineVersion ? `?baselineVersion=${baselineVersion}` : '';
    return this.client.get(`/design/drift${qs}`, DetectDriftResponse);
  }

  /**
   * Rollback tokens to a previous version snapshot (creates new version)
   * @param targetVersion Version to rollback to
   * @param rationale Optional rationale for audit logging
   * @returns RollbackResponse with previousVersion, newVersion, hash, durationMs
   */
  async rollbackTokens(targetVersion: number, rationale?: string): Promise<ReturnType<typeof RollbackResponse.parse>> {
    const payload: RollbackRequest = { targetVersion, rationale } as any;
    return this.client.post('/design/rollback', payload, RollbackResponse);
  }
}
