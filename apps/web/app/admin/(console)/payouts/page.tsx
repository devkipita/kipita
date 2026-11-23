import { loadPayoutHistory, loadPayoutQueue } from "@/lib/admin/console.server";
import { PayoutsView, type PayoutsTab } from "@/components/admin/console/PayoutsView";

export const metadata = {
  title: "Payouts",
  robots: { index: false, follow: false },
};

const TABS: PayoutsTab[] = ["pay", "paid", "reconcile"];

export default async function AdminPayoutsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.includes(sp.tab as PayoutsTab) ? (sp.tab as PayoutsTab) : "pay";

  const queue = tab === "pay" ? await loadPayoutQueue() : null;
  const history = tab === "paid" ? await loadPayoutHistory(30) : null;

  return (
    <PayoutsView
      key={tab}
      tab={tab}
      queue={queue?.data ?? null}
      history={history?.data ?? null}
      error={queue?.error ?? history?.error ?? null}
    />
  );
}
