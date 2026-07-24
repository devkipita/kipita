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
