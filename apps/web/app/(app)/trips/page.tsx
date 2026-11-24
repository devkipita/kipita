import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TripsView } from "@/components/trips/TripsView";
import { getProfile } from "@/lib/auth/session";
import { fetchMyBookings, fetchPublishedTrips } from "@/lib/trips/server";
import { routeBetween } from "@/lib/maps/routes.server";
import { placeKey, type TripRoute } from "@/lib/maps/types";

export const metadata: Metadata = {
  title: "Trips",
  robots: { index: false, follow: false },
};

export default async function TripsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/auth/sign-in?next=/trips");

  const [{ current, previous }, published] = await Promise.all([
    fetchMyBookings(profile.id),
    fetchPublishedTrips(profile.id),
  ]);
  const requests = current
    .filter((b) => b.driver_id === profile.id && b.status === "requested")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const live = published.find((t) => t.status === "in_progress");
  const destination = live ? placeKey(live.to_location, live.to_lat ?? null, live.to_lng ?? null) : "";
  const liveRoute: Promise<TripRoute | null> = live
    ? routeBetween(placeKey(live.from_location, live.from_lat ?? null, live.from_lng ?? null), destination).then((r) =>
        r?.polyline ? { polyline: r.polyline, seconds: r.seconds, destination } : null,
      )
    : Promise.resolve(null);

  return (
    <TripsView
      liveRoute={liveRoute}
      current={current}
      previous={previous}
      requests={requests}
      published={published}
      viewerId={profile.id}
    />
  );
}
