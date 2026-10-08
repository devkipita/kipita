import type { Metadata } from "next";
import { KipitaLanding } from "@/components/landing/KipitaLanding";
import { getProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await getProfile();
  return <KipitaLanding profile={profile} />;
}
