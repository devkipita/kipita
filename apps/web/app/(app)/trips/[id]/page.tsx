import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TripDetail } from "@/components/trips/TripDetail";
import { getProfile } from "@/lib/auth/session";
import { routeBetween } from "@/lib/maps/routes.server";
import { placeKey, type TripRoute } from "@/lib/maps/types";
import { cancellationConfigFromSettings } from "@kipita/shared";
import { fetchPlatform } from "@/lib/platform.server";
import { createClient } from "@/lib/supabase/server";
import { fetchBooking } from "@/lib/trips/server";
import type { NoShowState } from "@/lib/trips/types";

export const metadata: Metadata = {
  title: "Trip",
  robots: { index: false, follow: false },
};

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect(`/auth/sign-in?next=/trips/${id}`);

  const [booking, walletBalance, platform, noShow] = await Promise.all([
    fetchBooking(id, profile.id),
    createClient()
      .then((supabase) => supabase.from("wallets").select("balance").eq("user_id", profile.id).maybeSingle())
      .then(({ data, error }) => (error ? null : Number(data?.balance ?? 0))),
    fetchPlatform(),
    // Columns from migration 063. If it has not run, the query errors and this is null.
    createClient()
      .then((supabase) =>
        supabase
          .from("bookings")
          .select("cancel_tier, no_show_marked_at, no_show_disputed_at")
          .eq("id", id)
          .maybeSingle(),
      )
      .then(({ data, error }): NoShowState | null =>
        error || !data
          ? null
          : {
              tier: (data.cancel_tier as string | null) ?? null,
              markedAt: (data.no_show_marked_at as string | null) ?? null,
              disputedAt: (data.no_show_disputed_at as string | null) ?? null,
            },
      ),
  ]);
  if (!booking) notFound();

  const trip = booking.trip;
  const showMap = trip && !["completed", "cancelled", "rejected"].includes(booking.status);
  const destination = trip ? placeKey(trip.to_location, trip.to_lat, trip.to_lng) : "";
  const route: Promise<TripRoute | null> = showMap
    ? routeBetween(placeKey(trip.from_location, trip.from_lat, trip.from_lng), destination).then((r) =>
        r?.polyline ? { polyline: r.polyline, seconds: r.seconds, destination } : null,
      )
    : Promise.resolve(null);

  return (
    <TripDetail
      booking={booking}
      viewerId={profile.id}
      viewerPhone={profile.phone}
      walletBalance={walletBalance}
      cancelConfig={cancellationConfigFromSettings(platform.settings)}
      noShow={noShow}
      route={route}
    />
  );
}
