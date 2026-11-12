import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchMyCars } from "@/lib/home/vehicle";
import { ProfileView } from "@/components/profile/ProfileView";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const profile = await requireProfile("/profile");
  const supabase = await createClient();
  const cars = await fetchMyCars(supabase, profile.id).catch(() => []);
  return <ProfileView profile={profile} cars={cars} />;
}
