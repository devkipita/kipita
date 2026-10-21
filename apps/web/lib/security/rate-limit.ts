import "server-only";

/**
 * A sliding-window limiter for server actions and route handlers.
 *
 * Auth is covered too: sign-in, sign-up, password reset and OTP all run through
 * server actions in lib/auth/auth-actions.ts rather than calling GoTrue from the
 * browser, so every attempt passes through here before it reaches Supabase.
 *
 * State is in-memory, so each serverless instance counts separately and the
 * effective limit is (limit x instances). Swap the map for Redis if that ever
 * needs to be a real quota.
 */

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();
const SWEEP_EVERY_MS = 5 * 60 * 1000;

/** Drop windows nothing has touched recently so the map can't grow forever. */
function sweep(now: number) {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.hits.length === 0 || now - bucket.hits[bucket.hits.length - 1] > SWEEP_EVERY_MS) {
      buckets.delete(key);
    }
  }
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterMs: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key) ?? { hits: [] };
  const cutoff = now - windowMs;
  bucket.hits = bucket.hits.filter((at) => at > cutoff);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const retryAfterMs = bucket.hits[0] + windowMs - now;
    return { ok: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length };
}

/** Human-readable "try again in …" for a rejected action. */
export function retryMessage(retryAfterMs: number): string {
  const seconds = Math.ceil(retryAfterMs / 1000);
  if (seconds <= 60) return `Slow down a moment. Try again in ${seconds}s.`;
  const minutes = Math.ceil(seconds / 60);
  return `You've done that a few times. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

/** Limits per action, tuned to be invisible to a real person. */
export const LIMITS = {
  postAlert: { limit: 5, windowMs: 10 * 60 * 1000 },
  comment: { limit: 15, windowMs: 5 * 60 * 1000 },
  reserveSeat: { limit: 10, windowMs: 10 * 60 * 1000 },
  submitKyc: { limit: 5, windowMs: 60 * 60 * 1000 },
  postTrip: { limit: 5, windowMs: 60 * 60 * 1000 },

  signInIdentity: { limit: 8, windowMs: 15 * 60 * 1000 },
  signInIp: { limit: 30, windowMs: 15 * 60 * 1000 },
  signUpIdentity: { limit: 4, windowMs: 60 * 60 * 1000 },
  signUpIp: { limit: 12, windowMs: 60 * 60 * 1000 },
  passwordResetIdentity: { limit: 3, windowMs: 60 * 60 * 1000 },
  passwordResetIp: { limit: 10, windowMs: 60 * 60 * 1000 },
  passwordUpdate: { limit: 6, windowMs: 60 * 60 * 1000 },
  otpSendIdentity: { limit: 4, windowMs: 30 * 60 * 1000 },
  otpSendIp: { limit: 12, windowMs: 30 * 60 * 1000 },
  otpVerifyIdentity: { limit: 8, windowMs: 15 * 60 * 1000 },
  proxyIp: { limit: 60, windowMs: 60 * 1000 },
} as const;

export function enforce(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  return rateLimit(key, limit, windowMs);
}
