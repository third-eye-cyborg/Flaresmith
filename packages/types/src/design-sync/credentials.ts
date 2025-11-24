// T015: Zod schemas for credential status & actions
import { z } from 'zod';

export const CredentialProviderType = z.enum(['notification','design','documentation','testing','ai','analytics']);
export const CredentialStatus = z.enum(['valid','revoked','expired','pending']);

export const CredentialRecord = z.object({
  id: z.string().uuid(),
  providerType: CredentialProviderType,
  status: CredentialStatus,
  lastValidationTime: z.string().optional(),
  rotationDue: z.string().optional(),
  metadata: z.record(z.any()),
});

export const CredentialActionRequest = z.object({
  id: z.string().uuid(),
  action: z.enum(['rotate','validate','revoke']),
});

export const CredentialActionResult = z.object({
  id: z.string().uuid(),
  status: CredentialStatus,
  message: z.string(),
});

export type CredentialRecord = z.infer<typeof CredentialRecord>;
export type CredentialActionRequest = z.infer<typeof CredentialActionRequest>;
export type CredentialActionResult = z.infer<typeof CredentialActionResult>;
import { z } from 'zod';
/**
 * T015: Zod schemas for credential governance
 */

export const CredentialProviderTypeEnum = z.enum(['notification','design','documentation','testing','ai','analytics']);
export const CredentialStatusEnum = z.enum(['valid','revoked','expired','pending']);

export const CredentialRecord = z.object({
  providerType: CredentialProviderTypeEnum,
  status: CredentialStatusEnum,
  lastValidationTime: z.string().datetime().nullable().optional(),
  rotationDue: z.string().datetime().nullable().optional(),
  metadata: z.record(z.any()),
});

export const CredentialListResponse = z.object({
  items: z.array(CredentialRecord),
});

export const CredentialActionEnum = z.enum(['validate','revoke','rotate']);
export const CredentialActionRequest = z.object({
  providerType: CredentialProviderTypeEnum,
  action: CredentialActionEnum,
});

export const CredentialActionResult = z.object({
  providerType: CredentialProviderTypeEnum,
  status: CredentialStatusEnum,
});

export type CredentialProviderType = z.infer<typeof CredentialProviderTypeEnum>;
export type CredentialRecord = z.infer<typeof CredentialRecord>;
export type CredentialActionRequest = z.infer<typeof CredentialActionRequest>;
export type CredentialActionResult = z.infer<typeof CredentialActionResult>;
