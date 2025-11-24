/**
 * T047 & T048: Override Validation Service
 * Feature: 004-design-system
 * FR-024, FR-006, FR-021 (parity gating prerequisite)
 *
 * Provides validation logic for theme overrides:
 * - Size policy enforcement (≤5% auto, 5–10% approval, >10% reject)
 * - Circular reference detection
 * - Color format validation (for color category tokens)
 * - Aggregate validation orchestrator returning structured result
 */

import { BaseDesignSystemService } from './auditService';
import {
  TokenDiff,
  validateOverrideSize,
  ColorValue,
  DesignToken,
} from '@flaresmith/types';
import { validateCircularReferences } from '@flaresmith/utils';

/** Error codes planned for T059 (defined here as constants; formal centralization later) */
export const OVERRIDE_ERROR_CODES = {
  TOO_LARGE: 'DESIGN_OVERRIDE_TOO_LARGE',
  CIRCULAR: 'DESIGN_OVERRIDE_CIRCULAR_REFERENCE',
  INVALID_COLOR: 'DESIGN_OVERRIDE_INVALID_COLOR',
} as const;

export interface OverrideValidationResult {
  valid: boolean;
  errors: Array<{ code: string; message: string; details?: Record<string, unknown> }>;
  sizePct: number;
  requiresApproval: boolean;
  cycles?: string[][];
  invalidColors?: string[];
}

/** Map for quick token lookup by name */
export type TokenLookup = Map<string, DesignToken>;

/** Utility: Build lookup map */
export function buildTokenLookup(tokens: DesignToken[]): TokenLookup {
  return new Map(tokens.map((t) => [t.name, t]));
}

/**
 * OverrideValidationService encapsulates validation logic.
 */
export class OverrideValidationService extends BaseDesignSystemService {
  /** Compute size policy outcome */
  computeOverrideSize(diff: TokenDiff[], totalTokenCount: number): {
    sizePct: number; requiresApproval: boolean; valid: boolean; reason?: string;
  } {
    const result = validateOverrideSize(diff, totalTokenCount);
    // Map snake_case to camelCase to keep internal consistency
    const mapped: { sizePct: number; requiresApproval: boolean; valid: boolean; reason?: string } = {
      sizePct: result.size_pct,
      requiresApproval: result.requires_approval,
      valid: result.valid,
    };
    if (result.reason) mapped.reason = result.reason;
    return mapped;
  }

  /** Detect circular references using diff newValue reference syntax ${token.name} */
  checkCircularReferences(diff: TokenDiff[]): { valid: boolean; cycles: string[][]; message?: string } {
    return validateCircularReferences(diff);
  }

  /** Validate color formats for tokens whose base category is color */
  validateColorFormat(diff: TokenDiff[], baseTokens: TokenLookup): string[] {
    const invalid: string[] = [];
    for (const change of diff) {
      const base = baseTokens.get(change.name);
      if (!base) continue; // Unknown token; could be new - allow for now (additional rule later)
      if (base.category !== 'color') continue;
      const valueStr = String(change.newValue);
      const colorResult = ColorValue.safeParse(valueStr);
      if (!colorResult.success) {
        invalid.push(change.name);
      }
    }
    return invalid;
  }

  /** Orchestrated validation */
  async validateOverride(params: {
    diff: TokenDiff[];
    totalTokenCount: number;
    baseTokens: DesignToken[];
  }): Promise<OverrideValidationResult> {
    const { diff, totalTokenCount, baseTokens } = params;
    const errors: OverrideValidationResult['errors'] = [];

    // Size policy
    const size = this.computeOverrideSize(diff, totalTokenCount);
    if (!size.valid) {
      errors.push({
        code: OVERRIDE_ERROR_CODES.TOO_LARGE,
        message: size.reason || 'Override exceeds allowed size policy (>10%)',
        details: { sizePct: size.sizePct },
      });
    }

    // Circular references
    const circular = this.checkCircularReferences(diff);
    if (!circular.valid) {
      errors.push({
        code: OVERRIDE_ERROR_CODES.CIRCULAR,
        message: circular.message || 'Circular token references detected',
        details: { cycles: circular.cycles },
      });
    }

    // Color validation
    const lookup = buildTokenLookup(baseTokens);
    const invalidColors = this.validateColorFormat(diff, lookup);
    if (invalidColors.length > 0) {
      errors.push({
        code: OVERRIDE_ERROR_CODES.INVALID_COLOR,
        message: 'One or more color token values have invalid format',
        details: { tokens: invalidColors },
      });
    }

    const valid = errors.length === 0;

    return {
      valid,
      errors,
      sizePct: size.sizePct,
      requiresApproval: size.requiresApproval,
      cycles: circular.cycles,
      invalidColors,
    };
  }
}

export default OverrideValidationService;
