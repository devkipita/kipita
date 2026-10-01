import { requireAdmin } from "@/lib/auth";
import { AdminSupportView } from "@/components/admin/AdminSupportView";
import { fetchAdminCases } from "@/lib/support/admin";

export const metadata = { title: "Support" };

export default async function AdminSupportPage() {
  const admin = await requireAdmin();
  const cases = await fetchAdminCases();

  return (
    <AdminSupportView name={admin.full_name} image={admin.image} cases={cases} />
  );
}
