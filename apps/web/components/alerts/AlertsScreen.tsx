import { getProfile } from "@/lib/auth/session";
import {
  fetchAlertServer,
  fetchAlertsServer,
  fetchFollowingServer,
  fetchRouteTownsServer,
} from "@/lib/alerts/server";
import { AlertsView } from "./AlertsView";

export async function AlertsScreen({ openId }: { openId?: string }) {
  const [alerts, profile, open] = await Promise.all([
    fetchAlertsServer(),
    getProfile(),
    openId ? fetchAlertServer(openId) : Promise.resolve(null),
  ]);

  const [followingIds, routeTowns] = profile
    ? await Promise.all([
        fetchFollowingServer(profile.id),
        fetchRouteTownsServer(profile.id),
      ])
    : [[], []];

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
