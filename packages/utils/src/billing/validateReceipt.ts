import { createHash } from "crypto";

/**
 * T036: Receipt validation helper (FR-050)
 * Normalizes receipt payload and derives idempotency key.
 */
export interface RawReceipt {
  receiptToken: string;
  productId?: string;
  platform?: string; // ios|android
  amountCents?: number;
}

export interface ValidatedReceipt {
  idempotencyKey: string;
  receiptTokenHash: string;
  productId?: string;
  platform?: string;
  amountCents?: number;
}

export function validateReceipt(raw: RawReceipt): ValidatedReceipt {
  if (!raw.receiptToken) throw new Error("Missing receipt token");
  const tokenTrimmed = raw.receiptToken.trim();
  const tokenHash = createHash("sha256").update(tokenTrimmed).digest("hex");
  const idempotencyKey = `receipt:${tokenHash}`;
  return {
    idempotencyKey,
    receiptTokenHash: tokenHash,
    productId: raw.productId,
    platform: raw.platform,
    amountCents: raw.amountCents,
  };
}
