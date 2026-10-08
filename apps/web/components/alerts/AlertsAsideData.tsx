import { AlertsAside } from "./AlertsAside";
import { fetchAlertFaqs, fetchTrendingRoads } from "@/lib/alerts/server";

export async function AlertsAsideData() {
  const [trending, faqs] = await Promise.all([
    fetchTrendingRoads(),
    fetchAlertFaqs(),
  ]);

  return <AlertsAside trending={trending} faqs={faqs} />;
}
