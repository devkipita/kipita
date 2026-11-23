import type { createClient } from "@/lib/supabase/server";

/**
 * Whether the signed-in person's phone number is confirmed.
 *
 * A signed-in person is not allowed to read `users.phone_verified` (the column is not granted to them), so a
 * plain select of it fails for everyone and would turn every driver away, confirmed or not. The database
 * function `my_phone_verified()` (migration 075) reads it for them. Until 075 is applied the function does not
 * exist; the auth record is asked then, which is where the texted code confirms the number.
 */
export async function isPhoneConfirmed(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("my_phone_verified");
  if (!error && typeof data === "boolean") return data;
  const { data: auth } = await supabase.auth.getUser();
  return !!auth.user?.phone_confirmed_at;
}
