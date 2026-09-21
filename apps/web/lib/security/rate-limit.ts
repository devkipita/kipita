import "server-only";

/**
 * A sliding-window limiter for server actions.
 *
 * **What this does and does not cover.** It protects the things that run on our
 * server — posting alerts, comments, reservations, KYC. It cannot protect
 * sign-in or sign-up, because those go straight from the browser to Supabase's
 * GoTrue and never touch this process. The controls for auth abuse are
 * Supabase's own rate limits and a CAPTCHA provider, both configured in the
 * Supabase dashboard; the client-side throttle in the auth forms is a courtesy
 * to honest users, not a defence.
 *
 * State is in-memory, so each serverless instance counts separately and the
 * effective limit is (limit x instances). That is fine for the abuse this
 * guards against — a single client hammering an endpoint — but it is not a
 * quota. Swap the map for Redis or a Postgres table if that ever matters.
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
  if (seconds <= 60) return `Slow down a moment — try again in ${seconds}s.`;
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
} as const;
