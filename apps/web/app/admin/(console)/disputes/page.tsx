import { loadReports } from "@/lib/admin/console.server";
import { DisputesView, type DisputesTab } from "@/components/admin/console/DisputesView";

export const metadata = {
  title: "Disputes",
  robots: { index: false, follow: false },
};

export default async function AdminDisputesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab: DisputesTab = sp.tab === "reviewing" || sp.tab === "closed" ? sp.tab : "open";
  const [list, open] = await Promise.all([loadReports(tab), tab === "open" ? null : loadReports("open")]);
  const openRows = tab === "open" ? list.data : open?.data;
  const safetyOpen = openRows?.find((r) => r.type === "safety") ?? null;

  return <DisputesView key={tab} tab={tab} rows={list.data} error={list.error} safetyOpen={safetyOpen} />;
}
