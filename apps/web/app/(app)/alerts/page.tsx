import type { Metadata } from "next";
import { AlertsView } from "@/components/alerts/AlertsView";
import { getProfile } from "@/lib/auth/session";
import {
  fetchAlertsServer,
  fetchRouteTownsServer,
} from "@/lib/alerts/server";

export const metadata: Metadata = {
  title: "Road alerts",
  description:
    "Live road conditions across Kenya, traffic, accidents, closures, police checks and weather, reported by drivers on the route.",
  alternates: { canonical: "/alerts" },
};

export default async function AlertsPage() {
  const [alerts, profile] = await Promise.all([
    fetchAlertsServer(),
    getProfile(),
  ]);

  const routeTowns = profile ? await fetchRouteTownsServer(profile.id) : [];

  return (
    <AlertsView
      initialAlerts={alerts ?? []}
      initialFailed={alerts === null}
      profile={profile}
      routeTowns={routeTowns}
    />
  );
}
