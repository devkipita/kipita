import { Suspense } from "react";
import type { Metadata } from "next";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { searchTrips } from "@/lib/home/search";
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

/**
 * Public find-a-ride page. Browsing needs no account; booking and posting do.
 * Fully dynamic (cookies + auth), so never add `revalidate` here.
 */
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

  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);

  const items = await searchTrips(supabase, {
    from,
    to,
    date: date || null,
    seats,
  }).catch(() => []);

  return (
    <FindRideView
      profile={profile}
      initialItems={items}
      initialForm={{ from, to, date, seats }}
      offersSlot={
        <Suspense key="offers" fallback={null}>
          <OffersBand />
        </Suspense>
      }
    />
  );
}
