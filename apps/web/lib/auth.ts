import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  full_name: string;
  is_admin: boolean;
  image?: string;
}

/**
 * Gate a server component to admins. Redirects to the login page when the
 * caller is signed out or not an admin. Returns the admin's profile otherwise.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, is_admin, image:avatar_url")
    .eq("auth_id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/admin/login?denied=1");

  return {
    ...(profile as AdminUser),
    image:
      profile.image ??
      (typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : typeof user.user_metadata?.picture === "string"
          ? user.user_metadata.picture
          : undefined),
  };
}
