import { z } from "zod";

/**
 * T041: Notification segments & preferences schemas
 */
export const NotificationSegment = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  criterionJson: z.record(z.any()),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string().optional(),
});

export const NotificationPreference = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  segmentsSubscribed: z.array(z.string().uuid()),
  updatedAt: z.string().optional(),
});

export type NotificationSegment = z.infer<typeof NotificationSegment>;
export type NotificationPreference = z.infer<typeof NotificationPreference>;
