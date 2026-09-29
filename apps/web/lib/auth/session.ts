import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_COLUMNS, type Profile } from "./types";

/**
 * Server-side auth helpers. These read the session from cookies during SSR, so
 * pages render already knowing who the user is — no client-side auth flicker.
 */

/** The authenticated Supabase user, or null. */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function authAvatarUrl(user: User): string | null {
  return typeof user.user_metadata?.avatar_url === "string"
    ? user.user_metadata.avatar_url
    : typeof user.user_metadata?.picture === "string"
      ? user.user_metadata.picture
      : null;
}

function isManagedAvatarUrl(url: string | null | undefined): url is string {
  return (
    typeof url === "string" &&
    url.includes("/storage/v1/object/public/avatars/")
  );
}

function mergedAvatarUrl(
  rowAvatarUrl: string | null,
  user: User,
): string | null {
  if (isManagedAvatarUrl(rowAvatarUrl)) return rowAvatarUrl;
  return authAvatarUrl(user) ?? rowAvatarUrl ?? null;
}

/**
 * `users.full_name` is NOT NULL DEFAULT '', and `sync_auth_user_profile()` only
 * fills it from `raw_user_meta_data`. A plain email signup therefore lands with
 * an empty name, which surfaces as a blank byline everywhere. Fall back to the
 * auth metadata, then to the email local part, before giving up.
 */
function displayName(rowName: string | null | undefined, user: User): string {
  const fromRow = rowName?.trim();
  if (fromRow) return fromRow;

  const meta = user.user_metadata?.full_name;
  if (typeof meta === "string" && meta.trim()) return meta.trim();

  const local = user.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (local) return local.replace(/\b\w/g, (c) => c.toUpperCase());

  return "Kipita user";
}

/** A display-safe profile built from the auth record alone — used when the
 *  `users` row is missing (trigger not fired / RLS) so authed users never loop. */
function synthesize(user: User): Profile {
  return {
    id: user.id,
    auth_id: user.id,
    full_name: displayName(null, user),
    email: user.email ?? null,
    phone: user.phone ?? null,
    avatar_url: authAvatarUrl(user),
    date_of_birth: null,
    gender: null,
    city: null,
    country: "KE",
    is_verified: false,
    email_verified: !!user.email_confirmed_at,
    phone_verified: !!user.phone_confirmed_at,
    rating: 0,
    total_trips: 0,
    created_at: user.created_at ?? new Date().toISOString(),
  };
}

/**
 * Full profile for the signed-in user, or null if signed out. If authenticated
 * but the `users` row doesn't exist yet, we create it (best effort) and fall
 * back to a synthesized profile so an authed user is never treated as absent.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const merge = (row: Profile): Profile => ({
    ...row,
    full_name: displayName(row.full_name, user),
    email: user.email ?? row.email ?? null,
    phone: user.phone ?? row.phone ?? null,
    avatar_url: mergedAvatarUrl(row.avatar_url, user),
  });

  // `current_user_profile()` is SECURITY DEFINER and returns the caller's whole
  // row. A plain select cannot: migration 004 revoked table-level SELECT on
  // users and never re-granted `email`/`phone`, so asking for PROFILE_COLUMNS
  // is denied for the entire table and this silently fell through to
  // synthesize(), whose id is the AUTH id rather than users.id.
  const { data: own } = await supabase.rpc("current_user_profile");
  const ownRow = Array.isArray(own) ? own[0] : own;
  if (ownRow) return merge(ownRow as Profile);

  const { data } = await supabase
    .from("users")
    .select(PROFILE_COLUMNS)
    .eq("auth_id", user.id)
    .maybeSingle();
  if (data) return merge(data as Profile);

  // Row missing — the trigger may not exist here. Try to create it.
  const { data: created } = await supabase
    .from("users")
    .insert({
      auth_id: user.id,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
      email: user.email ?? null,
      phone: user.phone ?? null,
    })
    .select("id, auth_id")
    .maybeSingle();
  if (created) {
    const { data: after } = await supabase.rpc("current_user_profile");
    const afterRow = Array.isArray(after) ? after[0] : after;
    if (afterRow) return merge(afterRow as Profile);
  }

  // Insert blocked (RLS) — render from the auth record so we don't loop.
  return synthesize(user);
}

/** Gate a page on auth. Redirects to sign-in only when truly signed out. */
export async function requireProfile(returnTo = "/profile"): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(returnTo)}`);
  }
  return profile;
}
