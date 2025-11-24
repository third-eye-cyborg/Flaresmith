import { createHash } from "crypto";

/**
 * T034: Mapbox token hashing utility (FR-071)
 * Hashes token with pepper (env-provided) + optional salt for defense-in-depth.
 */
export function hashMapboxToken(token: string, pepper: string, salt?: string): { hash: string; prefix: string; suffix: string } {
  const normalized = token.trim();
  const prefix = normalized.substring(0, 6);
  const suffix = normalized.substring(normalized.length - 4);
  const material = `${pepper}::${salt || ""}::${normalized}`;
  const hash = createHash("sha256").update(material).digest("hex");
  return { hash, prefix, suffix };
}
