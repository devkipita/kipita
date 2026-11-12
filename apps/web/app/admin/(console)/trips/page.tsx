import { loadTrips } from "@/lib/admin/console.server";
import { TripsView } from "@/components/admin/console/TripsView";

export const metadata = {
  title: "Trips",
  robots: { index: false, follow: false },
};

const SIZE = 25;

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "";
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { data, error } = await loadTrips({ status, search: q, page, size: SIZE });

  return <TripsView data={data} error={error} status={status} q={q} page={page} size={SIZE} />;
}
