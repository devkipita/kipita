import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AppUser = { user: User | null; id: string | null };

export async function resolveAppUser(supabase: SupabaseClient): Promise<AppUser> {
  const [
    {
      data: { user },
    },
    { data: id },
  ] = await Promise.all([supabase.auth.getUser(), supabase.rpc("current_app_user_id")]);
  return { user, id: user ? ((id as string | null) ?? null) : null };
}
