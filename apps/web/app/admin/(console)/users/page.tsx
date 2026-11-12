import { requireAdmin } from "@/lib/auth";
import { loadAudit, loadUsers } from "@/lib/admin/console.server";
import type { UserRole } from "@/lib/admin/console";
import { UsersView, type UsersTab } from "@/components/admin/console/UsersView";

export const metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

const SIZE = 25;
const ROLES: UserRole[] = ["all", "rider", "driver", "suspended"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; role?: string; q?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const tab: UsersTab = sp.tab === "admins" || sp.tab === "audit" ? sp.tab : "users";
  const role = ROLES.includes(sp.role as UserRole) ? (sp.role as UserRole) : "all";
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  if (tab === "audit") {
    const audit = await loadAudit(undefined, 100);
    return (
      <UsersView tab={tab} role={role} q={q} page={page} size={SIZE} selfId={admin.id} users={null} audit={audit.data} error={audit.error} />
    );
  }

  const users = await loadUsers({ search: q, role: tab === "admins" ? "admin" : role, page, size: SIZE });
  return (
    <UsersView tab={tab} role={role} q={q} page={page} size={SIZE} selfId={admin.id} users={users.data} audit={null} error={users.error} />
  );
}
