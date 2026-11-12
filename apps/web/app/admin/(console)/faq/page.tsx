import { AdminFaqView } from "@/components/admin/AdminFaqView";

export const metadata = {
  title: "Help centre",
  robots: { index: false, follow: false },
};

export default function AdminFaqPage() {
  return <AdminFaqView />;
}
