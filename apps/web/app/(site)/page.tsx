import { KipitaLanding } from "@/components/landing/KipitaLanding";
import { getProfile } from "@/lib/auth/session";

export default async function HomePage() {
  // Server-fetched so the nav renders knowing who's signed in — no auth flicker.
  const profile = await getProfile();
  return <KipitaLanding profile={profile} />;
}
