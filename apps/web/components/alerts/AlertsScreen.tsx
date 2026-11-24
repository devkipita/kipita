import { getProfile } from "@/lib/auth/session";
import {
  fetchAlertServer,
  fetchAlertsServer,
  fetchFollowingServer,
  fetchRouteTownsServer,
} from "@/lib/alerts/server";
import { AlertsView } from "./AlertsView";

export async function AlertsScreen({ openId }: { openId?: string }) {
  const viewer = getProfile();
  const [alerts, profile, open, followingIds, routeTowns] = await Promise.all([
    viewer.then((p) => fetchAlertsServer({ viewerId: p?.id ?? null })),
    viewer,
    openId ? fetchAlertServer(openId) : Promise.resolve(null),
    viewer.then((p) => (p ? fetchFollowingServer(p.id) : [])),
    viewer.then((p) => (p ? fetchRouteTownsServer(p.id) : [])),
  ]);

  return (
    <AlertsView
      initialAlerts={alerts ?? []}
      initialFailed={alerts === null}
      initialOpen={open}
      profile={profile}
      followingIds={followingIds}
      routeTowns={routeTowns}
    />
  );
}
