import { requireAdmin } from "@/lib/auth";
import { AdminFaqView } from "@/components/admin/AdminFaqView";

export const metadata = {
  title: "Help FAQ",
  robots: { index: false, follow: false },
};

export default async function AdminFaqPage() {
  const admin = await requireAdmin();

  return <AdminFaqView name={admin.full_name} image={admin.image} />;
}
