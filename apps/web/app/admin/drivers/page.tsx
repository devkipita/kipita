import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminDriversView } from "@/components/admin/AdminDriversView";

export const metadata: Metadata = {
  title: "Driver verification",
  robots: { index: false, follow: false },
};

export default async function AdminDriversPage() {
  const admin = await requireAdmin();
  return <AdminDriversView name={admin.full_name} image={admin.image} />;
}
