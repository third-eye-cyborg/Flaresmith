// T011: Zod schemas for design sync operations
import { z } from 'zod';

export const DirectionMode = z.enum(['design_to_code','code_to_design','bidirectional']);

export const SyncComponentDiff = z.object({
  componentName: z.string(),
  variant: z.string().optional(),
  changedFields: z.array(z.string()),
  diffHash: z.string(),
});

export const ExecuteSyncInput = z.object({
  components: z.array(z.string()).min(1),
  direction: DirectionMode,
  diffs: z.array(SyncComponentDiff),
  explain: z.boolean().optional(), // RAG flag usage
});

export const SyncOperationResult = z.object({
  operationId: z.string().uuid(),
  applied: z.number(),
  skipped: z.number(),
  failed: z.number(),
  durationMs: z.number().int().nonnegative(),
  reversibleUntil: z.string(),
});

export type ExecuteSyncInput = z.infer<typeof ExecuteSyncInput>;
export type SyncOperationResult = z.infer<typeof SyncOperationResult>;
import { z } from 'zod';
/**
 * T011: Zod schemas for sync operations
 * Feature: 006-design-sync-integration
 * Spec Reference: specs/006-design-sync-integration/spec.md
 */

export const SyncDirectionEnum = z.enum(['code_to_design','design_to_code','bidirectional']);

export const SyncOperationComponentInput = z.object({
  componentId: z.string().uuid(),
  direction: SyncDirectionEnum,
  excludeVariants: z.array(z.string()).optional(),
});

export const ExecuteSyncInput = z.object({
  components: z.array(SyncOperationComponentInput),
  dryRun: z.boolean().optional().default(false),
});

export const DiffItem = z.object({
  componentId: z.string().uuid(),
  changeTypes: z.array(z.string()),
  severity: z.enum(['low','medium','high']).optional(),
});

export const DiffSummary = z.object({
  total: z.number(),
  items: z.array(DiffItem),
});

export const SyncOperationResult = z.object({
  operationId: z.string().uuid(),
  status: z.string(),
  components: z.array(z.string().uuid()),
  diffSummary: DiffSummary,
  reversibleUntil: z.string().datetime(),
});

export type SyncDirection = z.infer<typeof SyncDirectionEnum>;
export type ExecuteSyncInput = z.infer<typeof ExecuteSyncInput>;
export type SyncOperationResult = z.infer<typeof SyncOperationResult>;
export type DiffSummary = z.infer<typeof DiffSummary>;
