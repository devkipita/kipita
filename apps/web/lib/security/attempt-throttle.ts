"use client";

/**
 * Client-side throttle for repeated auth attempts.
 *
 * **This is not a security control.** Sign-in and sign-up go straight from the
 * browser to Supabase's GoTrue, so our server never sees them and cannot rate
 * limit them — and anything enforced in the browser can be bypassed by not
 * using the browser. What this does is stop an honest user (or a stuck retry
 * loop) from hammering the endpoint and tripping Supabase's own limits, and it
 * makes credential-guessing through the actual UI tedious.
 *
 * The real controls for auth abuse are configured in the Supabase dashboard:
 * Authentication → Rate Limits, and Authentication → Bot and Abuse Protection
 * (hCaptcha / Turnstile). Turn both on before launch.
 *
 * State lives in sessionStorage so it survives a reload of the auth page but
 * never leaks between browser profiles.
 */

const PREFIX = "kipita-attempts:";
const WINDOW_MS = 10 * 60 * 1000;

type Attempts = { at: number[] };

/** How long to lock out after n failures — grows, then plateaus. */
function backoffMs(failures: number): number {
  if (failures < 3) return 0;
  if (failures < 5) return 15_000;
  if (failures < 8) return 60_000;
  return 5 * 60 * 1000;
}

function read(key: string): number[] {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Attempts;
    const cutoff = Date.now() - WINDOW_MS;
    return (parsed.at ?? []).filter((at) => at > cutoff);
  } catch {
    return [];
  }
}

function write(key: string, at: number[]): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ at }));
  } catch {
    // Private mode / storage disabled — degrade to no throttling.
  }
}

/** Milliseconds the caller must wait, or 0 when they may proceed. */
export function attemptCooldownMs(key: string): number {
  const at = read(key);
  const wait = backoffMs(at.length);
  if (wait === 0) return 0;
  const last = at[at.length - 1] ?? 0;
  return Math.max(0, last + wait - Date.now());
}

export function recordFailedAttempt(key: string): void {
  write(key, [...read(key), Date.now()]);
}

export function clearAttempts(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clear.
  }
}

export function cooldownMessage(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds <= 60) return `Too many attempts. Wait ${seconds}s and try again.`;
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
}
