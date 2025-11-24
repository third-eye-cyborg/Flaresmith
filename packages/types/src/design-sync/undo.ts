// T013: Zod schemas for undo operations
import { z } from 'zod';

export const UndoRequest = z.object({
  operationId: z.string().uuid(),
});

export const UndoResult = z.object({
  undoneOperationId: z.string().uuid(),
  restoredComponents: z.array(z.string()),
  durationMs: z.number().int().nonnegative(),
  status: z.enum(['success','expired','failed']),
});

export type UndoRequest = z.infer<typeof UndoRequest>;
export type UndoResult = z.infer<typeof UndoResult>;
import { z } from 'zod';
/**
 * T013: Zod schemas for undo operations
 */

export const UndoRequest = z.object({
  operationId: z.string().uuid(),
});

export const UndoResult = z.object({
  undone: z.boolean(),
  restoredOperationId: z.string().uuid(),
});

export type UndoRequest = z.infer<typeof UndoRequest>;
export type UndoResult = z.infer<typeof UndoResult>;
