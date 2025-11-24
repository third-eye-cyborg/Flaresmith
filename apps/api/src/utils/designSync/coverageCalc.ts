/**
 * T058: Coverage calculation utility
 * Feature: 006-design-sync-integration
 * 
 * Computes variant coverage %, missing variants, and missing tests
 * for component story completeness reporting.
 */

export interface VariantDescriptor {
  name: string;
  props: Record<string, unknown>;
}

export interface StoryRecord {
  variantName: string;
  hasVisualTest: boolean;
  hasInteractionTest: boolean;
  hasA11yTest: boolean;
}

export interface ComponentCoverageInput {
  componentId: string;
  componentName: string;
  definedVariants: VariantDescriptor[];
  existingStories: StoryRecord[];
}

export interface CoverageResult {
  componentId: string;
  variantCoveragePct: number;
  missingVariants: string[];
  missingTests: Array<{
    variantName: string;
    missingTestTypes: string[];
  }>;
  warnings: string[];
}

/**
 * Calculate variant coverage percentage
 * @param definedVariants - Component variant definitions
 * @param existingStories - Currently registered stories
 * @returns Coverage percentage (0-100)
 */
export function calculateVariantCoverage(
  definedVariants: VariantDescriptor[],
  existingStories: StoryRecord[]
): number {
  if (definedVariants.length === 0) {
    return 100; // No variants defined = 100% coverage (edge case)
  }

  const storyVariantNames = new Set(existingStories.map(s => s.variantName));
  const coveredCount = definedVariants.filter(v => storyVariantNames.has(v.name)).length;
  
  return Math.round((coveredCount / definedVariants.length) * 100);
}

/**
 * Enumerate missing variants (defined but no story exists)
 * @param definedVariants - Component variant definitions
 * @param existingStories - Currently registered stories
 * @returns Array of missing variant names
 */
export function findMissingVariants(
  definedVariants: VariantDescriptor[],
  existingStories: StoryRecord[]
): string[] {
  const storyVariantNames = new Set(existingStories.map(s => s.variantName));
  return definedVariants
    .filter(v => !storyVariantNames.has(v.name))
    .map(v => v.name);
}

/**
 * Identify test gaps for variants with stories
 * @param existingStories - Currently registered stories
 * @returns Array of variants with missing test types
 */
export function findMissingTests(
  existingStories: StoryRecord[]
): Array<{ variantName: string; missingTestTypes: string[] }> {
  return existingStories
    .map(story => {
      const missingTestTypes: string[] = [];
      if (!story.hasVisualTest) missingTestTypes.push('visual');
      if (!story.hasInteractionTest) missingTestTypes.push('interaction');
      if (!story.hasA11yTest) missingTestTypes.push('a11y');
      
      return {
        variantName: story.variantName,
        missingTestTypes,
      };
    })
    .filter(item => item.missingTestTypes.length > 0);
}

/**
 * Generate warnings for coverage anomalies
 * @param input - Component coverage input data
 * @returns Array of warning messages
 */
export function generateWarnings(input: ComponentCoverageInput): string[] {
  const warnings: string[] = [];
  
  // Warn if stories exist for variants not in definition (orphaned stories)
  const definedVariantNames = new Set(input.definedVariants.map(v => v.name));
  const orphanedStories = input.existingStories.filter(s => !definedVariantNames.has(s.variantName));
  
  if (orphanedStories.length > 0) {
    warnings.push(
      `${orphanedStories.length} story(ies) exist for undefined variants: ${orphanedStories.map(s => s.variantName).join(', ')}`
    );
  }
  
  // Warn if no variants defined but stories exist (inconsistency)
  if (input.definedVariants.length === 0 && input.existingStories.length > 0) {
    warnings.push('No variants defined but stories exist; consider adding variant definitions');
  }
  
  // Warn if variant count is unusually high
  if (input.definedVariants.length > 20) {
    warnings.push(`High variant count (${input.definedVariants.length}); consider consolidating or reviewing definitions`);
  }
  
  return warnings;
}

/**
 * Compute complete coverage analysis for a component
 * @param input - Component coverage input data
 * @returns Coverage result with metrics and gaps
 */
export function computeCoverage(input: ComponentCoverageInput): CoverageResult {
  const variantCoveragePct = calculateVariantCoverage(input.definedVariants, input.existingStories);
  const missingVariants = findMissingVariants(input.definedVariants, input.existingStories);
  const missingTests = findMissingTests(input.existingStories);
  const warnings = generateWarnings(input);
  
  return {
    componentId: input.componentId,
    variantCoveragePct,
    missingVariants,
    missingTests,
    warnings,
  };
}
