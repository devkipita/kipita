"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validators/auth";

export type ActionState = { error?: string; ok?: boolean };

/**
 * Update the signed-in user's profile. Server action (Next.js mutating-data):
 * validates on the server, writes with the cookie-scoped client, then
 * revalidates the profile pages so the fresh row renders on navigation.
 */
export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    city: formData.get("city") ?? "",
    date_of_birth: formData.get("date_of_birth") ?? "",
    gender: formData.get("gender") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { full_name, city, date_of_birth, gender } = parsed.data;
  // Upsert so first-time profile completion creates the row if the DB trigger
  // hasn't (auth_id is unique).
  const { error } = await supabase.from("users").upsert(
    {
      auth_id: user.id,
      full_name,
      city: city || null,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "auth_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { ok: true };
}

/** Persist a newly uploaded avatar URL to the profile row. */
export async function updateAvatarAction(avatarUrl: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase.from("users").upsert(
    {
      auth_id: user.id,
      avatar_url: avatarUrl,
      email: user.email ?? null,
      phone: user.phone ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "auth_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { ok: true };
}

/** Sign out and return to the landing page. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
