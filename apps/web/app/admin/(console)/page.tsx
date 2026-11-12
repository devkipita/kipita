import { loadOverview } from "@/lib/admin/console.server";
import { OverviewView } from "@/components/admin/console/OverviewView";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminHome() {
  const { data, error } = await loadOverview();
  return <OverviewView data={data} error={error} />;
}
