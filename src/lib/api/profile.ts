import { supabase } from "@/lib/supabase";
import type { User } from "@/types";

const PROFILE_FIELDS =
  "id, full_name, first_name, last_name, avatar_url, date_of_birth, gender, preferred_language, country, city, is_verified, rating, total_trips, created_at, updated_at, profile_prompt_dismissed_at";

export async function fetchProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .select(PROFILE_FIELDS)
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data as User;
}

export async function updateProfile(
  userId: string,
  updates: Partial<
    Pick<
      User,
      | "full_name"
      | "first_name"
      | "last_name"
      | "avatar_url"
      | "city"
      | "country"
      | "date_of_birth"
      | "gender"
      | "preferred_language"
      | "profile_prompt_dismissed_at"
    >
  >,
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select(PROFILE_FIELDS)
    .single();
  if (error) throw error;
  return data as User;
}

export async function fetchUserById(userId: string): Promise<User> {
  return fetchProfile(userId);
}

// ── Email / phone changes ─────────────────────────────────────────────
// Email and phone are owned by Supabase Auth (never client-updatable on the
// users table). Changing either goes through auth.updateUser, which triggers a
// verification step; the DB trigger then syncs users.email / users.phone and
// the *_verified flags back into the profile.

/** Normalise a Kenyan number to E.164 (+254…) for auth calls. */
export function toE164(phone: string): string {
  const trimmed = phone.trim();
  return trimmed.startsWith("+") ? trimmed : `+254${trimmed.replace(/^0/, "")}`;
}

/**
 * Start an email change. Supabase emails a confirmation link to the NEW
 * address; the change only takes effect once the user clicks it.
 */
export async function requestEmailChange(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) throw error;
}

/**
 * Start a phone change. Supabase texts a 6-digit OTP to the new number, which
 * must be confirmed with {@link confirmPhoneChange}.
 */
export async function requestPhoneChange(phone: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ phone: toE164(phone) });
  if (error) throw error;
}

/** Confirm a pending phone change with the SMS OTP. */
export async function confirmPhoneChange(
  phone: string,
  token: string,
): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    phone: toE164(phone),
    token,
    type: "phone_change",
  });
  if (error) throw error;
}
