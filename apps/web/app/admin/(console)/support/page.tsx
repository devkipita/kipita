import { AdminSupportView } from "@/components/admin/AdminSupportView";
import { fetchAdminCases } from "@/lib/support/admin";

export const metadata = {
  title: "Support",
  robots: { index: false, follow: false },
};

export default async function AdminSupportPage() {
  const cases = await fetchAdminCases();
  return <AdminSupportView cases={cases} />;
}
