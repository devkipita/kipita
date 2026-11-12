import { supabase } from "@/lib/supabase";

/**
 * The signed-in user's `public.users.id`.
 *
 * The auth store seeds `user.id` with the *auth* id while the real profile
 * loads (see `app/_layout.tsx`), so any write that needs a `users.id` — a
 * `trips.driver_id`, a storage path the server compares against
 * `current_app_user_id()` — must resolve it here instead of trusting the store.
 */

let cached: { authId: string; userId: string } | null = null;

export class ProfileNotReadyError extends Error {
  constructor() {
    super("Your profile isn't ready yet. Sign out and back in, then try again.");
    this.name = "ProfileNotReadyError";
  }
}

export async function resolveAppUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  if (cached?.authId === user.id) return cached.userId;

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (error) throw error;

  const userId = (data as { id?: string } | null)?.id;
  if (!userId) throw new ProfileNotReadyError();

  cached = { authId: user.id, userId };
  return cached.userId;
}

export function clearAppUserId(): void {
  cached = null;
}
