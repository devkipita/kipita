import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TripDetail } from "@/components/trips/TripDetail";
import { getProfile } from "@/lib/auth/session";
import { routeBetween } from "@/lib/maps/routes.server";
import { placeKey, type TripRoute } from "@/lib/maps/types";
import { createClient } from "@/lib/supabase/server";
import { fetchBooking } from "@/lib/trips/server";

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

  const [booking, walletBalance] = await Promise.all([
    fetchBooking(id, profile.id),
    createClient()
      .then((supabase) => supabase.from("wallets").select("balance").eq("user_id", profile.id).maybeSingle())
      .then(({ data, error }) => (error ? null : Number(data?.balance ?? 0))),
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
      route={route}
    />
  );
}
