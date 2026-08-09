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

/** A display-safe profile built from the auth record alone — used when the
 *  `users` row is missing (trigger not fired / RLS) so authed users never loop. */
function synthesize(user: User): Profile {
  return {
    id: user.id,
    auth_id: user.id,
    full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
    email: user.email ?? null,
    phone: user.phone ?? null,
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
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
    email: user.email ?? row.email ?? null,
    phone: user.phone ?? row.phone ?? null,
  });

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
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  if (created) return merge(created as Profile);

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
