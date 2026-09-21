import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchDriverKyc } from "@/lib/driver/kyc";
import { readMode } from "@/lib/home/mode.server";
import { searchForMode } from "@/lib/home/search";
import { fetchAlertsServer } from "@/lib/alerts/server";
import { HomeView } from "@/components/home/HomeView";
import { OffersBand } from "@/components/home/OffersBand";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

/**
 * The signed-in home page.
 *
 * Already fully dynamic (auth + cookies), so reading the mode cookie costs
 * nothing extra. Never add `revalidate` or `dynamic = "force-static"` here.
 */
export default async function HomePage() {
  const profile = await requireProfile("/home");
  const mode = await readMode();
  const supabase = await createClient();

  const [items, alerts, kyc] = await Promise.all([
    // An un-filtered search: whatever is on offer right now.
    searchForMode(supabase, mode).catch(() => []),
    fetchAlertsServer({ limit: 5 }),
    fetchDriverKyc(supabase, profile.id),
  ]);

  return (
    <HomeView
      profile={profile}
      mode={mode}
      driverHasApplied={kyc.hasApplied}
      initialItems={items}
      initialAlerts={alerts}
      offersSlot={<OffersBand />}
    />
  );
}
