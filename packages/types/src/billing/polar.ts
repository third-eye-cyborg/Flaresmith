import { z } from "zod";

/**
 * T039: Polar billing schemas
 */
export const SubscriptionTier = z.enum(["free", "pro", "enterprise"]);
export const SubscriptionStatus = z.enum(["active", "canceled", "past_due", "trialing"]);

export const PolarCustomer = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  polarCustomerId: z.string(),
  subscriptionTier: SubscriptionTier,
  subscriptionStatus: SubscriptionStatus,
  currentPeriodEnd: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const CheckoutSessionCreateInput = z.object({
  planId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const CheckoutSession = z.object({
  id: z.string(),
  url: z.string().url(),
  expiresAt: z.string(),
});

export const PolarWebhookEvent = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: z.string(),
  data: z.record(z.any()),
});

export type PolarCustomer = z.infer<typeof PolarCustomer>;
export type CheckoutSessionCreateInput = z.infer<typeof CheckoutSessionCreateInput>;
export type CheckoutSession = z.infer<typeof CheckoutSession>;
export type PolarWebhookEvent = z.infer<typeof PolarWebhookEvent>;
