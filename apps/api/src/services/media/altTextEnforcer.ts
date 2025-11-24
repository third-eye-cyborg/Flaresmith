/**
 * Alt Text Enforcer Service (T110)
 *
 * Provides validation and optimization utilities for image alternative text.
 * Will be integrated with accessibility audit pipeline and content upload flows.
 *
 * Success Criteria Links:
 *  - SC-003 (Accessibility) descriptive text coverage
 *  - Future integration with design system audits
 *
 * Design Goals:
 *  - Idempotent optimization: Multiple optimize calls on same text should converge
 *  - Non-destructive: Original meaning preserved, only descriptive clarity enhanced
 *  - Deterministic: Same input yields same suggestions (no randomized ordering)
 *
 * Rules Implemented:
 *  - Length: min 8 chars, max 160 chars (hard cap to avoid verbosity)
 *  - Banned Generic Terms: "image", "photo", "picture", "graphic" unless context requires
 *  - Encourage nouns & adjectives: basic POS heuristic via word lists
 *  - Avoid trailing punctuation noise (trim excessive periods, exclamations)
 *  - Avoid redundancy with surrounding context (optional context parameter)
 *
 * Suggestion Strategy:
 *  - Remove banned generic terms at start
 *  - Insert descriptive nouns found in context or filename if missing
 *  - Add color/shape adjectives if determinable by heuristics (placeholder future computer vision hook)
 *
 * NOTE: No external AI calls here (pure heuristic). Future enhancement may add vision service.
 */

export interface AltTextValidationIssue {
  code: string; // e.g. ALT_LENGTH_TOO_SHORT, ALT_GENERIC_TERM, ALT_NEEDS_NOUN
  message: string;
  severity: 'info' | 'warn' | 'error';
  suggestion?: string; // optional suggested improvement snippet
}

export interface AltTextValidationResult {
  original: string;
  normalized: string; // trimmed & single spaced
  valid: boolean;
  issues: AltTextValidationIssue[];
  suggestions: string[]; // holistic suggestions
}

export interface AltTextOptimizeResult extends AltTextValidationResult {
  optimized: string; // final optimized alt text (may equal normalized if valid)
  changed: boolean;
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 160;
const GENERIC_TERMS = ['image', 'photo', 'picture', 'graphic'];
const BASIC_NOUN_CANDIDATES = ['dashboard', 'chart', 'diagram', 'user', 'profile', 'button', 'icon', 'logo', 'invoice', 'subscription', 'environment'];
const BASIC_ADJECTIVES = ['blue', 'green', 'red', 'circular', 'rounded', 'stacked', 'faded', 'bold'];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/,'');
}

function containsNoun(text: string): boolean {
  const lower = text.toLowerCase();
  return BASIC_NOUN_CANDIDATES.some(n => lower.includes(n));
}

function detectAdjectiveOpportunity(text: string): boolean {
  const lower = text.toLowerCase();
  // If no basic adjectives present and there is at least one noun, opportunity to enrich
  const hasAdj = BASIC_ADJECTIVES.some(a => lower.includes(a));
  const hasNoun = containsNoun(lower);
  return hasNoun && !hasAdj;
}

function checkLength(normalized: string, issues: AltTextValidationIssue[]): void {
  if (normalized.length < MIN_LENGTH) {
    issues.push({
      code: 'ALT_LENGTH_TOO_SHORT',
      message: `Alt text is too short (${normalized.length} < ${MIN_LENGTH}). Provide more descriptive context.`,
      severity: 'error',
      suggestion: 'Add a concise description of key visual elements.'
    });
  }
  if (normalized.length > MAX_LENGTH) {
    issues.push({
      code: 'ALT_LENGTH_TOO_LONG',
      message: `Alt text is too long (${normalized.length} > ${MAX_LENGTH}). Consider trimming unnecessary detail.`,
      severity: 'warn',
      suggestion: 'Remove redundant phrases; keep essential description only.'
    });
  }
}

function checkGenericTerms(normalized: string, issues: AltTextValidationIssue[]): void {
  const lower = normalized.toLowerCase();
  GENERIC_TERMS.forEach(term => {
    // Generic term considered issue if appears standalone or at start
    const standalone = new RegExp(`(^|\b)${term}(\b|$)`).test(lower);
    if (standalone) {
      issues.push({
        code: 'ALT_GENERIC_TERM',
        message: `Generic term "${term}" provides little descriptive value.`,
        severity: 'warn',
        suggestion: `Remove "${term}"; describe the subject instead (e.g., "Company logo", "Analytics dashboard chart").`
      });
    }
  });
}

function checkNounPresence(normalized: string, issues: AltTextValidationIssue[]): void {
  if (!containsNoun(normalized)) {
    issues.push({
      code: 'ALT_NEEDS_NOUN',
      message: 'No recognizable subject noun detected. Add a concrete subject (e.g., "user profile", "analytics chart").',
      severity: 'error',
      suggestion: 'Introduce a specific noun that represents the primary subject.'
    });
  }
}

function checkAdjectiveOpportunity(normalized: string, issues: AltTextValidationIssue[]): void {
  if (detectAdjectiveOpportunity(normalized)) {
    issues.push({
      code: 'ALT_CAN_BE_MORE_DESCRIPTIVE',
      message: 'Alt text could be more vivid; consider adding a color or shape adjective.',
      severity: 'info',
      suggestion: 'Add a relevant adjective (e.g., "blue", "rounded") if it aids understanding.'
    });
  }
}

export function validateAltText(text: string, context?: { filename?: string; surroundingText?: string }): AltTextValidationResult {
  const normalized = normalize(text);
  const issues: AltTextValidationIssue[] = [];

  checkLength(normalized, issues);
  checkGenericTerms(normalized, issues);
  checkNounPresence(normalized, issues);
  checkAdjectiveOpportunity(normalized, issues);

  // simple redundancy check with filename or surrounding text
  if (context?.filename) {
    const baseNamePart = context.filename?.split(/\.|_/)?.[0];
    if (baseNamePart) {
      const baseName = baseNamePart.toLowerCase();
      if (normalized.toLowerCase().includes(baseName) && baseName.length > 3) {
        issues.push({
          code: 'ALT_REDUNDANT_FILENAME',
          message: 'Alt text repeats filename base; remove redundant wording.',
          severity: 'info'
        });
      }
    }
  }
  if (context?.surroundingText) {
    const lower = context.surroundingText.toLowerCase();
    if (lower.includes(normalized.toLowerCase()) && normalized.length > 15) {
      issues.push({
        code: 'ALT_REDUNDANT_CONTEXT',
        message: 'Alt text duplicates nearby body text; consider summarizing instead.',
        severity: 'info'
      });
    }
  }

  const valid = issues.every(i => i.severity !== 'error');

  // Construct holistic suggestions (unique suggestion strings)
  const suggestions = Array.from(new Set(issues.filter(i => i.suggestion).map(i => i.suggestion!)));

  return { original: text, normalized, valid, issues, suggestions };
}

export function optimizeAltText(text: string, context?: { filename?: string; surroundingText?: string }): AltTextOptimizeResult {
  const validation = validateAltText(text, context);
  let optimized = validation.normalized;
  let changed = false;

  // Apply deterministic heuristic transformations if invalid or improvement flagged
  if (!validation.valid || validation.issues.length) {
    // Remove generic leading terms
    optimized = optimized.replace(/^(?:image|photo|picture|graphic)\b[\s,:-]*/i, '').trim();

    // If lacking noun, attempt insertion from filename or fallback noun list
    if (!containsNoun(optimized)) {
      const candidateFromFile = context?.filename?.split(/[-_.]/).find(part => BASIC_NOUN_CANDIDATES.includes(part.toLowerCase()));
      const noun = (candidateFromFile !== undefined && candidateFromFile !== null) ? candidateFromFile : BASIC_NOUN_CANDIDATES[0];
      optimized = optimized.length ? `${noun} ${optimized}` : noun;
    }

    // Add adjective if opportunity
    if (detectAdjectiveOpportunity(optimized)) {
      optimized = `${BASIC_ADJECTIVES[0]} ${optimized}`; // pick first for determinism
    }

    // Enforce length bounds gently: if too long, trim to last complete word before MAX_LENGTH
    if (optimized.length > MAX_LENGTH) {
      optimized = optimized.slice(0, MAX_LENGTH);
      optimized = optimized.replace(/\s+\S*$/, '').trim();
    }

    // If still too short, append simple clarifier
    if (optimized.length < MIN_LENGTH) {
      optimized = optimized + ' illustration';
    }

    optimized = normalize(optimized);
    changed = optimized !== validation.normalized;
  }

  // Re-run validation on optimized text for final report
  const finalValidation = validateAltText(optimized, context);
  return { ...finalValidation, optimized, changed };
}

export const AltTextEnforcer = {
  validate: validateAltText,
  optimize: optimizeAltText
};

export default AltTextEnforcer;
