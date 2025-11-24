// T012: Zod schemas for drift detection
import { z } from 'zod';

export const DriftComponentDiff = z.object({
  componentName: z.string(),
  variant: z.string().optional(),
  added: z.array(z.string()).default([]),
  removed: z.array(z.string()).default([]),
  modified: z.array(z.string()).default([]),
  diffHash: z.string(),
});

export const DriftSummary = z.object({
  hasDrift: z.boolean(),
  baselineVersion: z.string().optional(),
  components: z.array(DriftComponentDiff),
  totalComponents: z.number(),
  falsePositiveHeuristicsApplied: z.number().default(0),
});

export type DriftComponentDiff = z.infer<typeof DriftComponentDiff>;
export type DriftSummary = z.infer<typeof DriftSummary>;
import { z } from 'zod';
/**
 * T012: Zod schemas for drift detection output
 */

export const DriftChangeTypeEnum = z.enum(['added','removed','modified','renamed','variant_added','variant_removed']);

export const DriftItem = z.object({
  componentId: z.string().uuid(),
  changeTypes: z.array(DriftChangeTypeEnum),
  severity: z.enum(['low','medium','high']).default('low'),
});

export const DriftSummary = z.object({
  total: z.number(),
  items: z.array(DriftItem),
});

export type DriftItem = z.infer<typeof DriftItem>;
export type DriftSummary = z.infer<typeof DriftSummary>;
