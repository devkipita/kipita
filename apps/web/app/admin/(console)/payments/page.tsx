import { loadPayments } from "@/lib/admin/console.server";
import type { PaymentTab } from "@/lib/admin/console";
import { PaymentsView } from "@/components/admin/console/PaymentsView";

export const metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

const TABS: PaymentTab[] = ["escrow", "payouts", "refunds"];

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.includes(sp.tab as PaymentTab) ? (sp.tab as PaymentTab) : "escrow";
  const { data, error } = await loadPayments(tab);
  return <PaymentsView tab={tab} data={data} error={error} />;
}
