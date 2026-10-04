import type { Metadata } from "next";
import { KipitaLanding } from "@/components/landing/KipitaLanding";
import { getProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // Server-fetched so the nav renders knowing who's signed in — no auth flicker.
  const profile = await getProfile();
  return <KipitaLanding profile={profile} />;
}
