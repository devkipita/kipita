import { Suspense } from "react";
import type { Metadata } from "next";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { searchTrips, type HomeTrip } from "@/lib/home/search";
import { FindRideView } from "@/components/home/FindRideView";
import { OffersBand } from "@/components/home/OffersBand";

export const metadata: Metadata = {
  title: "Find a ride",
  description:
    "Search verified Kipita drivers heading your way across Kenya and book a seat with M-Pesa.",
  alternates: { canonical: "/home" },
};

type Params = Promise<{
  from?: string;
  to?: string;
  date?: string;
  seats?: string;
}>;

type Loaded = { items: HomeTrip[]; failed: boolean };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const sp = await searchParams;
  const from = sp.from?.trim() ?? "";
  const to = sp.to?.trim() ?? "";
  const date = sp.date?.trim() ?? "";
  const seats = Math.min(8, Math.max(1, Number(sp.seats) || 1));

  const search: Promise<Loaded> = createClient()
    .then((supabase) => searchTrips(supabase, { from, to, date: date || null, seats }))
    .then(
      (items) => ({ items, failed: false }),
      (error: unknown) => {
        console.error("home search failed", error);
        return { items: [], failed: true };
      },
    );

  const [profile, loaded] = await Promise.all([getProfile(), search]);

  return (
    <FindRideView
      profile={profile}
      initialItems={loaded.items}
      initialFailed={loaded.failed}
      initialForm={{ from, to, date, seats }}
      offersSlot={
        <Suspense key="offers" fallback={null}>
          <OffersBand />
        </Suspense>
      }
    />
  );
}
