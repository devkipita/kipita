import { loadProblems } from "@/lib/admin/console.server";
import { ProblemsView, type ProblemsTab } from "@/components/admin/console/ProblemsView";

export const metadata = {
  title: "Problems",
  robots: { index: false, follow: false },
};

export default async function AdminProblemsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab: ProblemsTab = sp.tab === "resolved" ? "resolved" : "open";
  const list = await loadProblems(tab);

  return <ProblemsView key={tab} tab={tab} rows={list.data} error={list.error} />;
}
