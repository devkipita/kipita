import { getProfile } from "@/lib/auth/session";
import {
  fetchAlertServer,
  fetchAlertsServer,
  fetchRouteTownsServer,
} from "@/lib/alerts/server";
import { AlertsView } from "./AlertsView";

export async function AlertsScreen({ openId }: { openId?: string }) {
  const [alerts, profile, open] = await Promise.all([
    fetchAlertsServer(),
    getProfile(),
    openId ? fetchAlertServer(openId) : Promise.resolve(null),
  ]);

  const routeTowns = profile ? await fetchRouteTownsServer(profile.id) : [];

  return (
    <AlertsView
      initialAlerts={alerts ?? []}
      initialFailed={alerts === null}
      initialOpen={open}
      profile={profile}
      routeTowns={routeTowns}
    />
  );
}
