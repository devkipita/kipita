import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { fetchRideDetail } from "@/lib/ride-detail.server";
import { fetchPlatform } from "@/lib/platform.server";
import { fareConfigFromSettings } from "@kipita/shared";
import { RideDetailView } from "@/components/rides/RideDetailView";

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

  return (
    <RideDetailView
      ride={ride}
      profile={profile}
      fareConfig={settingsLoaded ? fareConfigFromSettings(platform.settings) : null}
    />
  );
}
