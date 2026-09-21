/**
 * Passenger / driver mode.
 *
 * Mobile keeps this in MMKV and never writes it to the database; web keeps it
 * in a cookie so the server component can render the right view without a
 * flicker. Neither is an authorization signal — every driver write re-checks
 * `driver_profiles` server-side, and `trips` RLS still pins `driver_id` to
 * `auth.uid()`. That is why the cookie is deliberately not httpOnly.
 *
 * Pure module: safe to import from client components. The read lives in
 * `mode.server.ts` (it needs `next/headers`) and the write in `mode-actions.ts`
 * (a `"use server"` file may only export async functions).
 */

export type AppMode = "passenger" | "driver";

export const MODE_COOKIE = "kipita-mode";

/** A year — this is a preference, not a session. */
export const MODE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseMode(value: string | undefined | null): AppMode {
  return value === "driver" ? "driver" : "passenger";
}
