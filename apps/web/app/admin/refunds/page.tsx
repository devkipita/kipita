import { requireAdmin } from "@/lib/auth";
import { AdminRefundsView } from "@/components/admin/AdminRefundsView";

export const metadata = { title: "Refund review" };

export default async function AdminRefundsPage() {
  const admin = await requireAdmin();

  return <AdminRefundsView name={admin.full_name} image={admin.image} />;
}
