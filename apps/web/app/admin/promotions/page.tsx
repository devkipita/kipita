import { requireAdmin } from "@/lib/auth";
import { AdminPromotionsView } from "@/components/admin/AdminPromotionsView";

export const metadata = { title: "Offers" };

export default async function AdminPromotionsPage() {
  const admin = await requireAdmin();

  return <AdminPromotionsView name={admin.full_name} image={admin.image} />;
}
