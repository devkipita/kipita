import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { fetchRideDetail } from "@/lib/ride-detail.server";
import { fetchPlatform } from "@/lib/platform.server";
import { fareConfigFromSettings } from "@kipita/shared";
import { RideDetailView } from "@/components/rides/RideDetailView";
import { routeBetween } from "@/lib/maps/routes.server";
import { placeKey, type TripRoute } from "@/lib/maps/types";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
};

export const metadata: Metadata = {
  title: "Ride",
  robots: { index: false, follow: false },
};

export default async function RidePage({ params, searchParams }: PageProps) {
  const [{ id }, { kind }] = await Promise.all([params, searchParams]);

  const [ride, profile, platform] = await Promise.all([
    fetchRideDetail(id, kind === "request" ? "request" : "trip"),
    getProfile(),
    fetchPlatform(),
  ]);

  if (!ride) notFound();

  const settingsLoaded = Object.keys(platform.settings).length > 0;
  const destination = placeKey(ride.to_location);
  const route: Promise<TripRoute | null> = routeBetween(placeKey(ride.from_location), destination).then((r) =>
    r?.polyline ? { polyline: r.polyline, seconds: r.seconds, destination } : null,
  );

  return (
    <RideDetailView
      ride={ride}
      profile={profile}
      route={route}
      fareConfig={settingsLoaded ? fareConfigFromSettings(platform.settings) : null}
    />
  );
}
