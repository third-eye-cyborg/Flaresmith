/**
 * Key Rotation Compliance Evaluation (SC-011)
 * Determines whether signing key rotation cadence & grace window meet requirements.
 * - Active key age <= 92 days (p95 target, single-run check treats current age as sample)
 * - Previous key (grace) retained for <= 7 days after rotation
 * - Audit accuracy placeholder (future integration with secret_access_total vs audit table)
 */

export interface JwtKeyRecord {
  kid: string;
  active: boolean;
  createdAt: Date;
  rotatedAt?: Date | null; // timestamp when this key stopped being primary
}

export interface KeyRotationComplianceResult {
  compliant: boolean;
  activeAgeDays: number;
  graceKeyValid: boolean;
  violations: string[];
}

const MAX_ACTIVE_AGE_DAYS = 92; // SC-011 p95 threshold
const GRACE_WINDOW_DAYS = 7;    // retention window for previous key

export function evaluateKeyRotationCompliance(keys: JwtKeyRecord[], now: Date = new Date()): KeyRotationComplianceResult {
  const violations: string[] = [];
  if (keys.length === 0) {
    return { compliant: false, activeAgeDays: 0, graceKeyValid: false, violations: ["NO_KEYS_PRESENT"] };
  }
  // Active key assumed unique
  const active = keys.find(k => k.active);
  if (!active) {
    return { compliant: false, activeAgeDays: 0, graceKeyValid: false, violations: ["NO_ACTIVE_KEY"] };
  }
  const createdBase = active.rotatedAt && active.rotatedAt > active.createdAt ? active.rotatedAt : active.createdAt;
  const activeAgeMs = now.getTime() - createdBase.getTime();
  const activeAgeDays = activeAgeMs / (1000 * 60 * 60 * 24);
  if (activeAgeDays > MAX_ACTIVE_AGE_DAYS) {
    violations.push("ACTIVE_KEY_TOO_OLD");
  }
  // Grace key: previous non-active key with most recent rotatedAt timestamp (or createdAt fallback)
  const graceCandidates = keys.filter(k => !k.active);
  let graceKeyValid = true;
  if (graceCandidates.length) {
    const recent = graceCandidates.sort((a, b) => {
      const aTime = (a.rotatedAt ?? a.createdAt).getTime();
      const bTime = (b.rotatedAt ?? b.createdAt).getTime();
      return bTime - aTime; // desc
    })[0];
    const graceAgeDays = (now.getTime() - (recent.rotatedAt ?? recent.createdAt).getTime()) / (1000*60*60*24);
    if (graceAgeDays > GRACE_WINDOW_DAYS) {
      graceKeyValid = false;
      violations.push("GRACE_KEY_EXPIRED");
    }
  } else {
    // No grace key present immediately after rotation could be acceptable if brand new active key
    graceKeyValid = true;
  }
  return {
    compliant: violations.length === 0,
    activeAgeDays: Math.round(activeAgeDays * 100) / 100,
    graceKeyValid,
    violations,
  };
}
