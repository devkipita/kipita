import { AdminRefundsView } from "@/components/admin/AdminRefundsView";

export const metadata = {
  title: "Refund review",
  robots: { index: false, follow: false },
};

export default function AdminRefundsPage() {
  return <AdminRefundsView />;
}
