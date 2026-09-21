/**
 * Supabase connection env for the web app. Same project as mobile — the mobile
 * app reads EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY; Next.js exposes
 * NEXT_PUBLIC_* vars from apps/web/.env.local. Referencing the NEXT_PUBLIC_
 * names statically lets Next inline them into the browser bundle.
 *
 * Supabase renamed the browser-safe key from "anon" to "publishable", and new
 * projects hand you `sb_publishable_…` under the new name. Both spellings are
 * accepted so a freshly-copied key works without editing code. They must be
 * referenced as full literals, not built dynamically, or Next cannot inline them.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[supabase] Missing ${name}. Add it to apps/web/.env.local using the same ` +
        `values as apps/mobile/.env (URL + publishable/anon key), e.g.\n` +
        `  NEXT_PUBLIC_SUPABASE_URL=...\n  NEXT_PUBLIC_SUPABASE_ANON_KEY=...`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
