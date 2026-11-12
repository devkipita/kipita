import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { loadSidebarCounts } from "@/lib/admin/console.server";
import { ConsoleShell } from "@/components/admin/console/Shell";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const counts = await loadSidebarCounts();

  return (
    <ConsoleShell name={admin.full_name} image={admin.image} counts={counts}>
      {children}
    </ConsoleShell>
  );
}
