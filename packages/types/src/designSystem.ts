/**
 * Design System Zod Schemas
 * Feature: 004-design-system
 * 
 * Shared validation schemas for:
 * - Design tokens (color, spacing, typography, radius, elevation, glass, semantic)
 * - Theme overrides (environment-scoped customization)
 * - Component variants
 * - Accessibility audits
 * - Drift detection
 * - Token version snapshots
 */

import { z } from 'zod';

// =============================================================================
// Enums & Constants
// =============================================================================

export const DesignTokenCategory = z.enum([
  'color',
  'spacing',
  'typography',
  'radius',
  'elevation',
  'glass',
  'semantic',
]);
export type DesignTokenCategory = z.infer<typeof DesignTokenCategory>;

export const Environment = z.enum(['dev', 'staging', 'prod']);
export type Environment = z.infer<typeof Environment>;

export const OverrideStatus = z.enum([
  'submitted',
  'auto-applied',
  'pending-approval',
  'approved',
  'rejected',
]);
export type OverrideStatus = z.infer<typeof OverrideStatus>;

export const AccessibilityStatus = z.enum(['pass', 'warn', 'fail']);
export type AccessibilityStatus = z.infer<typeof AccessibilityStatus>;

export const ThemeMode = z.enum(['light', 'dark']);
export type ThemeMode = z.infer<typeof ThemeMode>;

// =============================================================================
// Token Naming & Value Schemas
// =============================================================================

/**
 * Token naming pattern: category.name.scale
 * Examples: primary.blue.500, spacing.md.16, semantic.error
 */
export const TokenName = z
  .string()
  .regex(
    /^(primary|accent|semantic|glass|elevation|spacing|radius|typography)\.[a-z0-9-]+(\.[0-9]{2,3})?$/,
    'Token name must follow pattern: category.name[.scale]'
  )
  .max(64, 'Token name must be ≤64 characters');

/**
 * Color value: hex, OKLCH, or HSL
 */
export const ColorValue = z.union([
  z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/, 'Invalid hex color'),
  z.string().regex(/^oklch\([^)]+\)$/, 'Invalid OKLCH color'),
  z.string().regex(/^hsl\([^)]+\)$/, 'Invalid HSL color'),
]);

/**
 * Generic token value (polymorphic based on category)
 */
export const TokenValue = z.union([
  ColorValue,
  z.number(), // spacing, elevation values
  z.string(), // typography families, etc.
  z.object({}).passthrough(), // complex values (typography objects)
]);

// =============================================================================
// Core Entities
// =============================================================================

/**
 * DesignToken: Atomic design value
 */
export const DesignToken = z.object({
  id: z.string().uuid(),
  name: TokenName,
  category: DesignTokenCategory,
  value: TokenValue,
  version: z.number().int().positive(),
  accessibility_meta: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type DesignToken = z.infer<typeof DesignToken>;

/**
 * DesignTokenSet: Collection of tokens at a specific version
 */
export const DesignTokenSet = z.object({
  version: z.number().int().positive(),
  tokens: z.array(DesignToken),
  hash: z.string().length(64, 'Hash must be SHA-256 (64 hex chars)'),
});
export type DesignTokenSet = z.infer<typeof DesignTokenSet>;

/**
 * DesignTokenVersionSnapshot: Immutable snapshot for rollback
 */
export const DesignTokenVersionSnapshot = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  snapshot: z.record(TokenValue), // Map of token name → value
  hash: z.string().length(64),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
});
export type DesignTokenVersionSnapshot = z.infer<
  typeof DesignTokenVersionSnapshot
>;

/**
 * TokenDiff: Single token change
 */
export const TokenDiff = z.object({
  name: TokenName,
  oldValue: TokenValue.optional(),
  newValue: TokenValue,
});
export type TokenDiff = z.infer<typeof TokenDiff>;

/**
 * ThemeOverride: User-submitted override
 */
export const ThemeOverride = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  environment: Environment,
  submitted_by: z.string().uuid(),
  status: OverrideStatus,
  size_pct: z.number().int().min(0).max(100),
  requires_approval: z.boolean(),
  token_diff: z.array(TokenDiff),
  approved_by: z.string().uuid().nullable().optional(),
  rationale: z.string().max(500).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ThemeOverride = z.infer<typeof ThemeOverride>;

/**
 * ComponentVariant: Component variant metadata
 */
export const ComponentVariant = z.object({
  id: z.string().uuid(),
  component: z.string().min(1).max(64),
  variant: z.string().min(1).max(64),
  tokens_used: z.array(TokenName),
  accessibility_status: AccessibilityStatus,
  created_at: z.string().datetime(),
});
export type ComponentVariant = z.infer<typeof ComponentVariant>;

/**
 * AccessibilityAuditPair: Single contrast evaluation
 */
export const AccessibilityAuditPair = z.object({
  fgToken: TokenName,
  bgToken: TokenName,
  ratio: z.number().positive(),
  status: AccessibilityStatus,
  recommendation: z.string().optional(),
});
export type AccessibilityAuditPair = z.infer<typeof AccessibilityAuditPair>;

/**
 * AccessibilityAuditResult: Contrast audit report
 */
export const AccessibilityAuditResult = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  mode: ThemeMode,
  report: z.array(AccessibilityAuditPair),
  passed_pct: z.number().int().min(0).max(100),
  created_at: z.string().datetime(),
});
export type AccessibilityAuditResult = z.infer<typeof AccessibilityAuditResult>;

/**
 * DriftChange: Single token change in drift detection
 */
export const DriftChange = z.object({
  name: TokenName,
  old: TokenValue,
  current: TokenValue,
});
export type DriftChange = z.infer<typeof DriftChange>;

/**
 * DriftCategoryDiff: Changes grouped by category
 */
export const DriftCategoryDiff = z.object({
  added: z.array(TokenName),
  removed: z.array(TokenName),
  changed: z.array(DriftChange),
});
export type DriftCategoryDiff = z.infer<typeof DriftCategoryDiff>;

/**
 * DesignDriftEvent: Drift detection event
 */
export const DesignDriftEvent = z.object({
  id: z.string().uuid(),
  baseline_version: z.number().int().positive(),
  current_hash: z.string().length(64),
  diff: z.record(DesignTokenCategory, DriftCategoryDiff),
  created_at: z.string().datetime(),
});
export type DesignDriftEvent = z.infer<typeof DesignDriftEvent>;

// =============================================================================
// Component Variant Schemas (US2)
// =============================================================================

/**
 * CardVariant schema: elevated (shadow), glass (blur + translucency), flat (no elevation)
 */
export const CardVariant = z.enum(['elevated', 'glass', 'flat']);
export type CardVariant = z.infer<typeof CardVariant>;

/**
 * BadgeVariant schema: default (solid), outline (border), subtle (soft background)
 */
export const BadgeVariant = z.enum(['default', 'outline', 'subtle']);
export type BadgeVariant = z.infer<typeof BadgeVariant>;

/**
 * ComponentVariantResponse: shape returned by API listing variants
 */
export const ComponentVariantResponse = z.object({
  id: z.string().uuid(),
  component: z.string().min(1).max(64),
  variant: z.string().min(1).max(64),
  tokens_used: z.array(TokenName),
  accessibility_status: AccessibilityStatus,
  created_at: z.string().datetime(),
});
export type ComponentVariantResponse = z.infer<typeof ComponentVariantResponse>;


// =============================================================================
// API Request/Response Schemas
// =============================================================================

/**
 * GET /design/tokens
 */
export const GetTokensRequest = z.object({
  category: DesignTokenCategory.optional(),
  version: z.number().int().positive().optional(),
});
export type GetTokensRequest = z.infer<typeof GetTokensRequest>;

export const GetTokensResponse = z.object({
  version: z.number().int().positive(),
  tokens: z.array(DesignToken),
});
export type GetTokensResponse = z.infer<typeof GetTokensResponse>;

// Response schema for component variants (used by API client) – ensures structural validation when imported
export const GetComponentVariantsResponse = z.object({
  variants: z.array(ComponentVariantResponse),
  count: z.number().int().nonnegative(),
  meta: z.record(z.unknown()).optional(),
});
export type GetComponentVariantsResponse = z.infer<typeof GetComponentVariantsResponse>;

/**
 * POST /design/overrides
 */
export const ApplyOverrideRequest = z
  .object({
    environment: Environment,
    diff: z.array(TokenDiff).min(1).max(40, 'Max 40 token changes per override'),
    rationale: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // Validate no circular references (basic check - full DFS in backend)
      const names = new Set(data.diff.map((d) => d.name));
      return data.diff.every((d) => {
        const newVal = String(d.newValue);
        return !newVal.includes('${') || !names.has(newVal);
      });
    },
    { message: 'Circular token references detected' }
  );
export type ApplyOverrideRequest = z.infer<typeof ApplyOverrideRequest>;

export const ApplyOverrideResponse = z.object({
  override: ThemeOverride,
});
export type ApplyOverrideResponse = z.infer<typeof ApplyOverrideResponse>;

/**
 * POST /design/rollback
 */
export const RollbackRequest = z.object({
  targetVersion: z.number().int().positive(),
  rationale: z.string().max(500).optional(),
});
export type RollbackRequest = z.infer<typeof RollbackRequest>;

export const RollbackResponse = z.object({
  previousVersion: z.number().int().positive(),
  newVersion: z.number().int().positive(),
  hash: z.string().length(64),
  durationMs: z.number().int().nonnegative(),
});
export type RollbackResponse = z.infer<typeof RollbackResponse>;

/**
 * GET /design/drift
 */
export const DetectDriftResponse = z.object({
  baselineVersion: z.number().int().positive(),
  currentVersion: z.number().int().positive(),
  drift: z.record(DesignTokenCategory, DriftCategoryDiff),
  hasDrift: z.boolean(),
});
export type DetectDriftResponse = z.infer<typeof DetectDriftResponse>;

/**
 * POST /design/audits/run
 */
export const RunAccessibilityAuditRequest = z.object({
  mode: ThemeMode.optional(),
  focusComponents: z.array(z.string()).optional(),
});
export type RunAccessibilityAuditRequest = z.infer<
  typeof RunAccessibilityAuditRequest
>;

export const RunAccessibilityAuditResponse = z.object({
  auditId: z.string().uuid(),
  status: z.enum(['started', 'running', 'completed', 'failed']),
});
export type RunAccessibilityAuditResponse = z.infer<
  typeof RunAccessibilityAuditResponse
>;

/**
 * GET /design/audits/latest
 */
export const GetLatestAuditRequest = z.object({
  mode: ThemeMode.optional(),
});
export type GetLatestAuditRequest = z.infer<typeof GetLatestAuditRequest>;

export const GetLatestAuditResponse = AccessibilityAuditResult;
export type GetLatestAuditResponse = z.infer<typeof GetLatestAuditResponse>;

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Validate override size policy
 */
export function validateOverrideSize(
  diff: TokenDiff[],
  totalTokenCount: number
): {
  size_pct: number;
  requires_approval: boolean;
  valid: boolean;
  reason?: string;
} {
  const size_pct = Math.round((diff.length / totalTokenCount) * 100);

  if (size_pct > 10) {
    return {
      size_pct,
      requires_approval: false,
      valid: false,
      reason: 'Override exceeds 10% of tokens (rejected by policy)',
    };
  }

  const requires_approval = size_pct > 5;

  return { size_pct, requires_approval, valid: true };
}

/**
 * Validate contrast ratio (WCAG AA)
 */
export function validateContrastRatio(
  ratio: number,
  isLargeText: boolean = false
): AccessibilityStatus {
  const threshold = isLargeText ? 3.0 : 4.5;
  if (ratio >= threshold) return 'pass';
  if (ratio >= threshold * 0.9) return 'warn';
  return 'fail';
}

/**
 * Normalize token set for hashing
 */
export function normalizeTokenSet(tokens: DesignToken[]): Record<string, unknown> {
  const sorted = [...tokens].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  return Object.fromEntries(
    sorted.map((t) => [t.name, { category: t.category, value: t.value }])
  );
}
