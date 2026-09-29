import type { ReactNode } from "react";
import { AlertsAside } from "@/components/alerts/AlertsAside";
import { AlertsColumns } from "@/components/alerts/AlertsColumns";
import { fetchAlertFaqs, fetchTrendingRoads } from "@/lib/alerts/server";

export default async function AlertsLayout({ children }: { children: ReactNode }) {
  const [trending, faqs] = await Promise.all([
    fetchTrendingRoads(),
    fetchAlertFaqs(),
  ]);

  return (
    <AlertsColumns aside={<AlertsAside trending={trending} faqs={faqs} />}>
      {children}
    </AlertsColumns>
  );
}
