import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  full_name: string;
  is_admin: boolean;
  image?: string;
}

type OwnRow = { id: string; full_name: string | null; is_admin: boolean | null; avatar_url: string | null };

/**
 * Gate a server component to admins. Redirects to the login page when the
 * caller is signed out or not an admin. Returns the admin's profile otherwise.
 */
export const requireAdmin = cache(async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient();
  const [user, { data }] = await Promise.all([getAuthUser(), supabase.rpc("current_user_profile")]);
  if (!user) redirect("/admin/login");

  const profile = (Array.isArray(data) ? data[0] : data) as OwnRow | null | undefined;
  if (!profile?.is_admin) redirect("/admin/login?denied=1");

  return {
    id: profile.id,
    full_name: profile.full_name ?? "",
    is_admin: true,
    image:
      profile.avatar_url ??
      (typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : typeof user.user_metadata?.picture === "string"
          ? user.user_metadata.picture
          : undefined),
  };
});
