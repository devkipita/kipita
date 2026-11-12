import { AdminPromotionsView } from "@/components/admin/AdminPromotionsView";

export const metadata = {
  title: "Promotions",
  robots: { index: false, follow: false },
};

export default function AdminPromotionsPage() {
  return <AdminPromotionsView />;
}
