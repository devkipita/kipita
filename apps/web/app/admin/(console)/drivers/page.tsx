import type { Metadata } from "next";
import { DriversView } from "@/components/admin/console/DriversView";

export const metadata: Metadata = {
  title: "Driver verification",
  robots: { index: false, follow: false },
};

export default function AdminDriversPage() {
  return <DriversView />;
}
