// T014: Zod schemas for coverage reporting
import { z } from 'zod';

export const CoverageReport = z.object({
  component: z.string(),
  variantCoveragePct: z.number().min(0).max(100),
  missingVariants: z.array(z.string()),
  missingTests: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
  generatedAt: z.string(),
});

export const CoverageSummary = z.object({
  reports: z.array(CoverageReport),
  overallVariantCoveragePct: z.number().min(0).max(100),
});

export type CoverageReport = z.infer<typeof CoverageReport>;
export type CoverageSummary = z.infer<typeof CoverageSummary>;
import { z } from 'zod';
/**
 * T014: Zod schemas for coverage reports
 */

export const CoverageReport = z.object({
  componentId: z.string().uuid(),
  variantCoveragePct: z.number(),
  missingVariants: z.array(z.string()),
  missingTests: z.array(z.string()),
  generatedAt: z.string().datetime(),
});

export type CoverageReport = z.infer<typeof CoverageReport>;
