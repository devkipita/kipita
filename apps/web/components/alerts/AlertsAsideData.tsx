import { AlertsAside } from "./AlertsAside";
import { fetchTrendingRoads } from "@/lib/alerts/server";

export async function AlertsAsideData() {
  const trending = await fetchTrendingRoads();
  return <AlertsAside trending={trending} />;
}
