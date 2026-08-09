import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { ProfileView } from "@/components/profile/ProfileView";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const profile = await requireProfile("/profile");
  return <ProfileView profile={profile} />;
}
