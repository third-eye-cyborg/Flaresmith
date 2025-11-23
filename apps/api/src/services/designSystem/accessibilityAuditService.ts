/**
 * Accessibility Audit Service
 * Feature: 004-design-system
 * Task: T063
 * 
 * Implements WCAG AA contrast validation for design tokens:
 * - FR-011: Accessibility validation for all semantic token pairs
 * - SC-003: ≥98% text/background pairs pass WCAG AA (4.5:1 normal text, 3:1 large text)
 * - Decision D-006: Use OKLCH for perceptual color accuracy
 * 
 * Methods:
 * - runAudit(): Trigger async audit job, return auditId
 * - auditTokenPair(): Evaluate contrast ratio for fg/bg pair
 * - generateAuditReport(): Compute audit results and persist to DB
 */

import { db } from '../../../db/connection';
import { designTokens, accessibilityAuditResults } from '../../../db/schema/designSystem';
import { eq } from 'drizzle-orm';
import type {
  ThemeMode,
  AccessibilityAuditPair,
} from '@flaresmith/types';
import { validateContrastRatio } from '@flaresmith/types';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Types
// =============================================================================

interface AuditOptions {
  mode?: ThemeMode;
  focusComponents?: string[];
  version?: number;
}

interface AuditJobResult {
  auditId: string;
  status: 'started' | 'running' | 'completed' | 'failed';
}

// =============================================================================
// Color Contrast Utilities
// =============================================================================

/**
 * Parse OKLCH color string to { L, C, H } components
 * Format: oklch(L C H) where L ∈ [0,1], C ∈ [0,0.4], H ∈ [0,360]
 */
function parseOKLCH(color: string): { L: number; C: number; H: number } | null {
  const match = color.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) return null;
  
  const [_, L, C, H] = match;
  return { L: parseFloat(L!), C: parseFloat(C!), H: parseFloat(H!) };
}

/**
 * Convert hex color to OKLCH (simplified approximation)
 * Full conversion requires sRGB → linear RGB → XYZ → OKLab → OKLCH
 * For audit purposes, we approximate: luminance ≈ L value
 */
function hexToOKLCH(hex: string): { L: number; C: number; H: number } | null {
  const match = hex.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (!match) return null;

  const r = parseInt(match[1]!.substring(0, 2), 16) / 255;
  const g = parseInt(match[1]!.substring(2, 4), 16) / 255;
  const b = parseInt(match[1]!.substring(4, 6), 16) / 255;

  // sRGB → linear RGB (gamma correction)
  const linearize = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rLin = linearize(r);
  const gLin = linearize(g);
  const bLin = linearize(b);

  // Relative luminance (Y component of XYZ)
  const luminance = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;

  // Map luminance to OKLCH L (approximate)
  const L = Math.pow(luminance, 1 / 3);

  return { L, C: 0, H: 0 }; // Simplified: no chroma/hue calculation
}

/**
 * Compute WCAG 2.1 contrast ratio from OKLCH L values
 * Contrast ratio = (L1 + 0.05) / (L2 + 0.05) where L1 > L2
 */
function computeContrastRatio(L1: number, L2: number): number {
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

// =============================================================================
// Audit Service
// =============================================================================

/**
 * Run accessibility audit (async job trigger)
 * Returns auditId immediately, audit runs in background
 */
export async function runAudit(options: AuditOptions = {}): Promise<AuditJobResult> {
  const auditId = uuidv4();
  const mode = options.mode || 'light';
  const start = Date.now();

  // Trigger async audit (in real implementation, use job queue like BullMQ)
  // For now, run synchronously
  setImmediate(() => {
    generateAuditReport(auditId, mode, options.version, options.focusComponents, start).catch(
      (error) => {
        console.error(`Audit ${auditId} failed:`, error);
      }
    );
  });

  return { auditId, status: 'started' };
}

/**
 * Generate audit report and persist to database
 */
export async function generateAuditReport(
  auditId: string,
  mode: ThemeMode,
  version?: number,
  _focusComponents?: string[], // Future: filter audit to specific components
  startTime?: number
): Promise<void> {
  // Load semantic tokens (text/background pairs)
  const tokenRecords = await db
    .select()
    .from(designTokens)
    .where(
      version ? eq(designTokens.version, version) : undefined as any
    );

  if (tokenRecords.length === 0) {
    throw new Error('No tokens found for audit');
  }

  // Extract semantic color tokens
  const semanticColors = tokenRecords.filter(
    (t: typeof tokenRecords[number]) => t.category === 'semantic' && typeof t.value === 'string'
  );

  // Define text/background pairs (based on naming convention)
  const pairs: Array<{ fgToken: string; bgToken: string }> = [];

  // Heuristic: semantic.text.* → foreground, semantic.surface.* → background
  const textTokens = semanticColors.filter((t: typeof semanticColors[number]) => t.name.includes('text'));
  const surfaceTokens = semanticColors.filter((t: typeof semanticColors[number]) => t.name.includes('surface'));

  // Create Cartesian product of text × surface pairs
  for (const fgToken of textTokens) {
    for (const bgToken of surfaceTokens) {
      pairs.push({ fgToken: fgToken.name, bgToken: bgToken.name });
    }
  }

  // Audit each pair
  const results: AccessibilityAuditPair[] = [];

  for (const { fgToken, bgToken } of pairs) {
    const fgColor = semanticColors.find((t: typeof semanticColors[number]) => t.name === fgToken)?.value as string;
    const bgColor = semanticColors.find((t: typeof semanticColors[number]) => t.name === bgToken)?.value as string;

    if (!fgColor || !bgColor) continue;

    const result = auditTokenPair(fgToken, fgColor, bgToken, bgColor);
    if (result) {
      results.push(result);
    }
  }

  // Compute passed percentage
  const passedCount = results.filter((r) => r.status === 'pass').length;
  const passedPct = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;

  const durationMs = startTime ? Date.now() - startTime : 0;
  // Persist to database
  await db.insert(accessibilityAuditResults).values({
    id: auditId,
    version: tokenRecords[0]!.version,
    mode,
    report: results as any, // JSONB field
    passedPct,
    durationMs
  });

  // Log audit completion event
  console.log(JSON.stringify({
    event: 'design.accessibility.audit.completed',
    auditId,
    version: tokenRecords[0]!.version,
    mode,
    passed_pct: passedPct,
    total_pairs: results.length,
    durationMs,
    timestamp: new Date().toISOString(),
  }));

  console.log(`✅ Audit ${auditId} completed: ${passedPct}% passed (${passedCount}/${results.length}) in ${durationMs}ms`);
}

/**
 * Audit a single token pair (foreground/background)
 * Returns AccessibilityAuditPair with contrast ratio and status
 */
export function auditTokenPair(
  fgTokenName: string,
  fgColor: string,
  bgTokenName: string,
  bgColor: string,
  isLargeText: boolean = false
): AccessibilityAuditPair | null {
  // Parse colors to OKLCH
  let fgOKLCH = parseOKLCH(fgColor);
  let bgOKLCH = parseOKLCH(bgColor);

  // Fallback: hex → OKLCH approximation
  if (!fgOKLCH && fgColor.startsWith('#')) {
    fgOKLCH = hexToOKLCH(fgColor);
  }
  if (!bgOKLCH && bgColor.startsWith('#')) {
    bgOKLCH = hexToOKLCH(bgColor);
  }

  if (!fgOKLCH || !bgOKLCH) {
    console.warn(`Skipping pair ${fgTokenName}/${bgTokenName}: invalid color format`);
    return null;
  }

  // Compute contrast ratio
  const ratio = computeContrastRatio(fgOKLCH.L, bgOKLCH.L);

  // Validate against WCAG AA thresholds
  const status = validateContrastRatio(ratio, isLargeText);

  return {
    fgToken: fgTokenName,
    bgToken: bgTokenName,
    ratio: parseFloat(ratio.toFixed(2)),
    status,
    recommendation:
      status === 'fail'
        ? `Increase contrast to ≥${isLargeText ? 3.0 : 4.5}:1 for WCAG AA compliance`
        : undefined,
  };
}

/**
 * Get latest audit result
 */
export async function getLatestAudit(mode?: ThemeMode) {
  const query = db
    .select()
    .from(accessibilityAuditResults)
    .orderBy(accessibilityAuditResults.createdAt);

  const audits = mode
    ? await query.where(eq(accessibilityAuditResults.mode, mode))
    : await query;

  if (audits.length === 0) {
    return null;
  }

  return audits[audits.length - 1]; // Most recent
}

export const accessibilityAuditService = {
  runAudit,
  generateAuditReport,
  auditTokenPair,
  getLatestAudit,
};
