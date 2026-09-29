import type { Metadata } from "next";
import { AlertsView } from "@/components/alerts/AlertsView";
import { getProfile } from "@/lib/auth/session";
import {
  fetchAlertsServer,
  fetchFollowingServer,
  fetchRouteTownsServer,
} from "@/lib/alerts/server";

export const metadata: Metadata = {
  title: "Road alerts",
  robots: { index: false, follow: false },
};

export default async function AlertsPage() {
  const [alerts, profile] = await Promise.all([
    fetchAlertsServer(),
    getProfile(),
  ]);

  const [followingIds, routeTowns] = profile
    ? await Promise.all([
        fetchFollowingServer(profile.id),
        fetchRouteTownsServer(profile.id),
      ])
    : [[], []];

  return (
    <AlertsView
      initialAlerts={alerts}
      profile={profile}
      followingIds={followingIds}
      routeTowns={routeTowns}
    />
  );
}
