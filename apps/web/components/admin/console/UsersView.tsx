"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styled from "styled-components";
import { SealCheck, Star } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { dateTime, describeAction, type AuditRow, type Paged, type UserRole, type UserRow } from "@/lib/admin/console";
import { setUserStatusAction } from "@/lib/admin/console-actions";
import {
  Button,
  Card,
  ChipRow,
  ConsequenceList,
  DataTable,
  EmptyState,
  FilterChip,
  Modal,
  PageHeader,
  Pagination,
  PersonCell,
  Pill,
  SearchBox,
  StatusChip,
  TableScroll,
  TabLink,
  Tabs,
  Toolbar,
  useToast,
} from "./ui";

export type UsersTab = "users" | "admins" | "audit";

const Verified = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.color.success};
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.color.muted};
`;

const ROLES: { key: UserRole; label: string }[] = [
  { key: "all", label: "All" },
  { key: "rider", label: "Riders" },
  { key: "driver", label: "Drivers" },
  { key: "suspended", label: "Suspended" },
];

function roleOf(u: UserRow) {
  if (u.is_admin) return "Admin";
  return u.is_driver ? "Driver" : "Rider";
}

function UsersTable({ data, selfId, onToggle }: { data: Paged<UserRow>; selfId: string; onToggle: (u: UserRow) => void }) {
  return (
    <TableScroll>
      <DataTable>
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Role</th>
            <th>Verified</th>
            <th>Trips</th>
            <th>Rating</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.rows.map((u) => (
            <tr key={u.id}>
              <td>
                <PersonCell>
                  <Avatar name={u.full_name || "User"} src={u.avatar_url} size={30} />
                  <span>
                    <strong>{u.full_name ?? "Unnamed"}</strong>
                    <small>Joined {dateTime(u.created_at).split(" · ")[0]}</small>
                  </span>
                </PersonCell>
              </td>
              <td>
                <span className="primary">{u.phone ?? "—"}</span>
                <small>{u.email ?? ""}</small>
              </td>
              <td>
                <Pill $tone={u.is_admin ? "info" : "neutral"}>{roleOf(u)}</Pill>
              </td>
              <td>
                {u.is_verified ? (
                  <Verified>
                    <SealCheck size={14} />
                    Verified
                  </Verified>
                ) : (
                  <Muted>No</Muted>
                )}
              </td>
              <td>
                <strong>{u.total_trips ?? 0}</strong>
              </td>
              <td>
                {u.rating ? (
                  <>
                    <Star size={12} weight="fill" /> {Number(u.rating).toFixed(1)}
                  </>
                ) : (
                  <Muted>—</Muted>
                )}
              </td>
              <td>
                <StatusChip status={u.status} label={u.status === "active" ? "Active" : undefined} />
              </td>
              <td>
                {u.id !== selfId && (u.status === "active" || u.status === "suspended") && (
                  <Button $variant={u.status === "active" ? "danger" : "outline"} style={{ minHeight: 32 }} onClick={() => onToggle(u)}>
                    {u.status === "active" ? "Suspend" : "Reactivate"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </TableScroll>
  );
}

function AuditTable({ rows }: { rows: AuditRow[] }) {
  return (
    <TableScroll>
      <DataTable>
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{dateTime(r.created_at)}</td>
              <td>
                <PersonCell>
                  <Avatar name={r.actor || "System"} src={r.actor_avatar} size={26} />
                  <strong>{r.actor ?? "System"}</strong>
                </PersonCell>
              </td>
              <td>
                <strong>{describeAction(r)}</strong>
              </td>
              <td>
                <span className="primary">{r.subject ?? "—"}</span>
                <small>{r.subject_id ?? ""}</small>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </TableScroll>
  );
}

export function UsersView({
  tab,
  role,
  q,
  page,
  size,
  selfId,
  users,
  audit,
  error,
}: {
  tab: UsersTab;
  role: UserRole;
  q: string;
  page: number;
  size: number;
  selfId: string;
  users: Paged<UserRow> | null;
  audit: AuditRow[] | null;
  error: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [target, setTarget] = useState<UserRow | null>(null);
  const [pending, startTransition] = useTransition();

  const href = (next: { tab?: UsersTab; role?: UserRole; page?: number }) => {
    const params = new URLSearchParams();
    const t = next.tab ?? tab;
    if (t !== "users") params.set("tab", t);
    const r = next.role ?? role;
    if (t === "users" && r !== "all") params.set("role", r);
    if (q && t !== "audit") params.set("q", q);
    if ((next.page ?? 1) > 1) params.set("page", String(next.page));
    const query = params.toString();
    return query ? `/admin/users?${query}` : "/admin/users";
  };

  const confirmToggle = () => {
    if (!target) return;
    const next = target.status === "active" ? "suspended" : "active";
    startTransition(async () => {
      const res = await setUserStatusAction(target.id, next);
      if (res.ok) {
        toast.show(`${target.full_name ?? "User"} is now ${next}.`);
        router.refresh();
      } else {
        toast.show(res.error, true);
      }
      setTarget(null);
    });
  };

  return (
    <>
      <PageHeader title="Users" description="Manage riders, drivers, admin access and the audit trail." />
      <Tabs>
        <TabLink href={href({ tab: "users", page: 1 })} $on={tab === "users"}>
          Users
        </TabLink>
        <TabLink href={href({ tab: "admins", page: 1 })} $on={tab === "admins"}>
          Admin team
        </TabLink>
        <TabLink href={href({ tab: "audit", page: 1 })} $on={tab === "audit"}>
          Audit log
        </TabLink>
      </Tabs>
      {tab !== "audit" && (
        <Toolbar>
          <ChipRow>
            {tab === "users" &&
              ROLES.map((r) => (
                <FilterChip key={r.key} href={href({ role: r.key })} $on={role === r.key} scroll={false}>
                  {r.label}
                </FilterChip>
              ))}
          </ChipRow>
          <SearchBox
            placeholder="Search name, phone or email"
            defaultValue={q}
            hidden={{ ...(tab !== "users" ? { tab } : {}), ...(tab === "users" && role !== "all" ? { role } : {}) }}
          />
        </Toolbar>
      )}
      <Card $flush style={{ marginTop: tab === "audit" ? 12 : 0 }}>
        {error ? (
          <EmptyState error title="We couldn't load this list" body={error} />
        ) : tab === "audit" ? (
          audit && audit.length > 0 ? (
            <AuditTable rows={audit} />
          ) : (
            <EmptyState title="No admin actions yet" body="Setting changes, driver decisions and suspensions appear here." />
          )
        ) : users && users.rows.length > 0 ? (
          <UsersTable data={users} selfId={selfId} onToggle={setTarget} />
        ) : (
          <EmptyState title="No users match" body="Try a different filter or search." />
        )}
      </Card>
      {tab !== "audit" && users && users.total > 0 && (
        <Pagination page={page} size={size} total={users.total} noun={tab === "admins" ? "admins" : "users"} href={(p) => href({ page: p })} />
      )}
      {target && (
        <Modal
          title={target.status === "active" ? `Suspend ${target.full_name ?? "user"}` : `Reactivate ${target.full_name ?? "user"}`}
          close={() => setTarget(null)}
          footer={
            <>
              <Button $variant="secondary" onClick={() => setTarget(null)}>
                Go back
              </Button>
              <Button $variant={target.status === "active" ? "danger" : "green"} onClick={confirmToggle} disabled={pending} aria-busy={pending}>
                {target.status === "active" ? "Suspend account" : "Reactivate account"}
              </Button>
            </>
          }
        >
          {target.status === "active"
            ? "The account is marked suspended. The change is recorded in the audit log."
            : "The account returns to active. The change is recorded in the audit log."}
          <ConsequenceList>
            <div>
              <dt>Role</dt>
              <dd>{roleOf(target)}</dd>
            </div>
            <div>
              <dt>Trips</dt>
              <dd>{target.total_trips ?? 0}</dd>
            </div>
          </ConsequenceList>
        </Modal>
      )}
      {toast.node}
    </>
  );
}
