// T068: Unit tests for coverage calculation utility
// Feature: 006-design-sync-integration
// Tests coverageCalc.ts functions

import { describe, it, expect } from 'vitest';
import {
  calculateVariantCoverage,
  findMissingVariants,
  findMissingTests,
  generateWarnings,
  computeCoverage,
  type VariantDescriptor,
  type StoryRecord,
  type ComponentCoverageInput,
} from '../../src/utils/designSync/coverageCalc';

describe('Coverage Calculation Utility', () => {
  describe('calculateVariantCoverage', () => {
    it('should return 100% when all variants have stories', () => {
      const variants: VariantDescriptor[] = [
        { name: 'primary', props: { variant: 'primary' } },
        { name: 'secondary', props: { variant: 'secondary' } },
      ];
      const stories: StoryRecord[] = [
        { variantName: 'primary', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
        { variantName: 'secondary', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
      ];

      const coverage = calculateVariantCoverage(variants, stories);
      expect(coverage).toBe(100);
    });

    it('should return 50% when half of variants have stories', () => {
      const variants: VariantDescriptor[] = [
        { name: 'primary', props: { variant: 'primary' } },
        { name: 'secondary', props: { variant: 'secondary' } },
      ];
      const stories: StoryRecord[] = [
        { variantName: 'primary', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
      ];

      const coverage = calculateVariantCoverage(variants, stories);
      expect(coverage).toBe(50);
    });

    it('should return 0% when no variants have stories', () => {
      const variants: VariantDescriptor[] = [
        { name: 'primary', props: { variant: 'primary' } },
      ];
      const stories: StoryRecord[] = [];

      const coverage = calculateVariantCoverage(variants, stories);
      expect(coverage).toBe(0);
    });

    it('should return 100% when no variants are defined (edge case)', () => {
      const variants: VariantDescriptor[] = [];
      const stories: StoryRecord[] = [];

      const coverage = calculateVariantCoverage(variants, stories);
      expect(coverage).toBe(100);
    });

    it('should round coverage percentage correctly', () => {
      const variants: VariantDescriptor[] = [
        { name: 'v1', props: {} },
        { name: 'v2', props: {} },
        { name: 'v3', props: {} },
      ];
      const stories: StoryRecord[] = [
        { variantName: 'v1', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
      ];

      const coverage = calculateVariantCoverage(variants, stories);
      expect(coverage).toBe(33); // 1/3 = 0.333... → 33%
    });
  });

  describe('findMissingVariants', () => {
    it('should identify all missing variants', () => {
      const variants: VariantDescriptor[] = [
        { name: 'primary', props: {} },
        { name: 'secondary', props: {} },
        { name: 'tertiary', props: {} },
      ];
      const stories: StoryRecord[] = [
        { variantName: 'primary', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
      ];

      const missing = findMissingVariants(variants, stories);
      expect(missing).toEqual(['secondary', 'tertiary']);
    });

    it('should return empty array when all variants have stories', () => {
      const variants: VariantDescriptor[] = [
        { name: 'primary', props: {} },
      ];
      const stories: StoryRecord[] = [
        { variantName: 'primary', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
      ];

      const missing = findMissingVariants(variants, stories);
      expect(missing).toEqual([]);
    });

    it('should return empty array when no variants defined', () => {
      const variants: VariantDescriptor[] = [];
      const stories: StoryRecord[] = [];

      const missing = findMissingVariants(variants, stories);
      expect(missing).toEqual([]);
    });
  });

  describe('findMissingTests', () => {
    it('should identify missing test types for each story', () => {
      const stories: StoryRecord[] = [
        { variantName: 'primary', hasVisualTest: true, hasInteractionTest: false, hasA11yTest: false },
        { variantName: 'secondary', hasVisualTest: false, hasInteractionTest: true, hasA11yTest: false },
      ];

      const missingTests = findMissingTests(stories);
      expect(missingTests).toEqual([
        { variantName: 'primary', missingTestTypes: ['interaction', 'a11y'] },
        { variantName: 'secondary', missingTestTypes: ['visual', 'a11y'] },
      ]);
    });

    it('should return empty array when all tests present', () => {
      const stories: StoryRecord[] = [
        { variantName: 'primary', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
      ];

      const missingTests = findMissingTests(stories);
      expect(missingTests).toEqual([]);
    });

    it('should return empty array when no stories exist', () => {
      const stories: StoryRecord[] = [];

      const missingTests = findMissingTests(stories);
      expect(missingTests).toEqual([]);
    });

    it('should list all three test types when none present', () => {
      const stories: StoryRecord[] = [
        { variantName: 'primary', hasVisualTest: false, hasInteractionTest: false, hasA11yTest: false },
      ];

      const missingTests = findMissingTests(stories);
      expect(missingTests).toEqual([
        { variantName: 'primary', missingTestTypes: ['visual', 'interaction', 'a11y'] },
      ]);
    });
  });

  describe('generateWarnings', () => {
    it('should warn about orphaned stories (stories without variant definitions)', () => {
      const input: ComponentCoverageInput = {
        componentId: '123',
        componentName: 'Button',
        definedVariants: [
          { name: 'primary', props: {} },
        ],
        existingStories: [
          { variantName: 'primary', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
          { variantName: 'orphaned', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
        ],
      };

      const warnings = generateWarnings(input);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('1 story(ies) exist for undefined variants');
      expect(warnings[0]).toContain('orphaned');
    });

    it('should warn when no variants defined but stories exist', () => {
      const input: ComponentCoverageInput = {
        componentId: '123',
        componentName: 'Button',
        definedVariants: [],
        existingStories: [
          { variantName: 'orphaned', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
        ],
      };

      const warnings = generateWarnings(input);
      expect(warnings).toContain('No variants defined but stories exist; consider adding variant definitions');
    });

    it('should warn when variant count is unusually high (>20)', () => {
      const variants: VariantDescriptor[] = Array.from({ length: 25 }, (_, i) => ({
        name: `variant${i}`,
        props: {},
      }));

      const input: ComponentCoverageInput = {
        componentId: '123',
        componentName: 'Button',
        definedVariants: variants,
        existingStories: [],
      };

      const warnings = generateWarnings(input);
      expect(warnings.some(w => w.includes('High variant count'))).toBe(true);
      expect(warnings.some(w => w.includes('25'))).toBe(true);
    });

    it('should return empty array when no anomalies detected', () => {
      const input: ComponentCoverageInput = {
        componentId: '123',
        componentName: 'Button',
        definedVariants: [
          { name: 'primary', props: {} },
          { name: 'secondary', props: {} },
        ],
        existingStories: [
          { variantName: 'primary', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
        ],
      };

      const warnings = generateWarnings(input);
      expect(warnings).toEqual([]);
    });
  });

  describe('computeCoverage (full integration)', () => {
    it('should compute complete coverage result', () => {
      const input: ComponentCoverageInput = {
        componentId: '123e4567-e89b-12d3-a456-426614174000',
        componentName: 'Button',
        definedVariants: [
          { name: 'primary', props: { variant: 'primary' } },
          { name: 'secondary', props: { variant: 'secondary' } },
          { name: 'disabled', props: { variant: 'disabled' } },
        ],
        existingStories: [
          { variantName: 'primary', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: false },
          { variantName: 'secondary', hasVisualTest: true, hasInteractionTest: false, hasA11yTest: false },
        ],
      };

      const result = computeCoverage(input);

      expect(result.componentId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.variantCoveragePct).toBe(67); // 2/3 variants have stories
      expect(result.missingVariants).toEqual(['disabled']);
      expect(result.missingTests).toHaveLength(2);
      expect(result.missingTests).toEqual([
        { variantName: 'primary', missingTestTypes: ['a11y'] },
        { variantName: 'secondary', missingTestTypes: ['interaction', 'a11y'] },
      ]);
      expect(result.warnings).toEqual([]);
    });

    it('should return perfect coverage when fully covered', () => {
      const input: ComponentCoverageInput = {
        componentId: '123',
        componentName: 'Button',
        definedVariants: [
          { name: 'primary', props: {} },
        ],
        existingStories: [
          { variantName: 'primary', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
        ],
      };

      const result = computeCoverage(input);

      expect(result.variantCoveragePct).toBe(100);
      expect(result.missingVariants).toEqual([]);
      expect(result.missingTests).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should include warnings in full coverage result', () => {
      const input: ComponentCoverageInput = {
        componentId: '123',
        componentName: 'Button',
        definedVariants: [],
        existingStories: [
          { variantName: 'orphaned', hasVisualTest: true, hasInteractionTest: true, hasA11yTest: true },
        ],
      };

      const result = computeCoverage(input);

      expect(result.variantCoveragePct).toBe(100); // No variants defined = 100%
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('No variants defined but stories exist');
    });
  });
});
