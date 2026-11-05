import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TripsView } from "@/components/trips/TripsView";
import { getProfile } from "@/lib/auth/session";
import {
  fetchCurrentBookings,
  fetchPreviousBookings,
  fetchPublishedTrips,
  fetchSeatRequests,
} from "@/lib/trips/server";

export const metadata: Metadata = {
  title: "Trips",
  robots: { index: false, follow: false },
};

export default async function TripsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/auth/sign-in?next=/trips");

  const [current, previous, requests, published] = await Promise.all([
    fetchCurrentBookings(profile.id),
    fetchPreviousBookings(profile.id),
    fetchSeatRequests(profile.id),
    fetchPublishedTrips(profile.id),
  ]);

  return (
    <TripsView
      current={current}
      previous={previous}
      requests={requests}
      published={published}
      viewerId={profile.id}
    />
  );
}
