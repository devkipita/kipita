import { requireAdmin } from "@/lib/auth";
import { AdminHomeView } from "@/components/admin/AdminHomeView";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminHome() {
  const admin = await requireAdmin();

  return <AdminHomeView name={admin.full_name} image={admin.image} />;
}
