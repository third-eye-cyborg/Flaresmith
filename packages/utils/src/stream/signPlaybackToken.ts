import { sign } from "hono/jwt";
import { randomUUID } from "crypto";

/**
 * T035: Stream playback token signer (FR-064)
 * Issues short-lived tokens (default TTL 5m) with denylist support via token_id.
 */
export interface PlaybackTokenOptions {
  ttlMs?: number; // default 5 minutes
  audience?: string;
}

export async function signPlaybackToken(streamId: string, secret: string, opts: PlaybackTokenOptions = {}) {
  const ttlMs = opts.ttlMs ?? 300_000;
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = nowSec + Math.floor(ttlMs / 1000);
  const jti = randomUUID();
  const payload = {
    sub: streamId,
    jti,
    aud: opts.audience || "cloudflare_stream",
    iat: nowSec,
    exp,
    type: "playback",
  };
  const token = await sign(payload, secret);
  return { token, jti, expiresAt: new Date(exp * 1000) };
}
