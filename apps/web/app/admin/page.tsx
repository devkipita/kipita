import { requireAdmin } from "@/lib/auth";
import { countPendingDrivers } from "@/lib/driver/queue.server";
import { AdminHomeView } from "@/components/admin/AdminHomeView";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const admin = await requireAdmin();
  const pendingDrivers = await countPendingDrivers();

  return (
    <AdminHomeView
      name={admin.full_name}
      image={admin.image}
      pendingDrivers={pendingDrivers}
    />
  );
}
