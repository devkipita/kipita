import { Suspense } from "react";
import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { readMode } from "@/lib/home/mode.server";
import { searchForMode } from "@/lib/home/search";
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

  // An un-filtered search: whatever is on offer right now.
  const items = await searchForMode(supabase, mode).catch(() => []);

  return (
    <HomeView
      profile={profile}
      initialItems={items}
      offersSlot={
        <Suspense key="offers" fallback={null}>
          <OffersBand />
        </Suspense>
      }
    />
  );
}
