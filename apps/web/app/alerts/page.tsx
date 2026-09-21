import type { Metadata } from "next";
import { getProfile } from "@/lib/auth/session";
import { fetchAlertsServer } from "@/lib/alerts/server";
import { AlertsView } from "@/components/alerts/AlertsView";

export const metadata: Metadata = {
  title: "Road alerts",
  // Alerts name real places and, often, real people — keep them out of search.
  robots: { index: false, follow: false },
};

export default async function AlertsPage() {
  // The feed is world-readable, so signed-out visitors get it too.
  const [alerts, profile] = await Promise.all([
    fetchAlertsServer(),
    getProfile(),
  ]);

  return <AlertsView initialAlerts={alerts} profile={profile} />;
}
