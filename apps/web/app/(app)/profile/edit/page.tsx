import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { EditProfileForm } from "@/components/profile/EditProfileForm";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false, follow: false },
};

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const profile = await requireProfile("/profile/edit");
  const { welcome } = await searchParams;
  return <EditProfileForm profile={profile} welcome={welcome === "1"} />;
}
