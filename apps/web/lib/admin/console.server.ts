import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AuditRow,
  Overview,
  Paged,
  Payments,
  PaymentTab,
  ProblemRow,
  ReportRow,
  TripRow,
  UserRole,
  UserRow,
} from "./console";

export type Loaded<T> = { data: T; error: null } | { data: null; error: string };

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<Loaded<T>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return { data: null, error: error.message };
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Request failed" };
  }
}

export function loadOverview() {
  return rpc<Overview>("admin_overview");
}

export function loadTrips(args: { status?: string | null; search?: string | null; page: number; size: number }) {
  return rpc<Paged<TripRow>>("admin_trips", {
    p_status: args.status || null,
    p_search: args.search || null,
    p_limit: args.size,
    p_offset: (args.page - 1) * args.size,
  });
}

export function loadPayments(tab: PaymentTab) {
  return rpc<Payments>("admin_payments", { p_tab: tab, p_limit: 100 });
}

export function loadUsers(args: { search?: string | null; role: UserRole; page: number; size: number }) {
  return rpc<Paged<UserRow>>("admin_users", {
    p_search: args.search || null,
    p_role: args.role === "all" ? null : args.role,
    p_limit: args.size,
    p_offset: (args.page - 1) * args.size,
  });
}

export function loadReports(status: string) {
  return rpc<ReportRow[]>("admin_reports", { p_status: status });
}

export function loadProblems(status: "open" | "resolved") {
  return rpc<ProblemRow[]>("admin_booking_problems", { p_status: status });
}

export function loadAudit(action?: string, limit = 50) {
  return rpc<AuditRow[]>("admin_audit_log", { p_action: action ?? null, p_limit: limit });
}

export async function loadSidebarCounts() {
  const supabase = await createClient();
  const [drivers, reports, problems] = await Promise.all([
    supabase.from("driver_profiles").select("user_id", { count: "exact", head: true }).eq("approval_status", "pending"),
    supabase.rpc("admin_reports", { p_status: "open" }),
    // Rides to review (migration 070). Bookings, not rows: a booking can carry two open problems.
    // On a database that has not run 070 this errors and counts as none.
    supabase.from("booking_problems").select("booking_id").eq("status", "open"),
  ]);
  return {
    drivers: drivers.count ?? 0,
    disputes: Array.isArray(reports.data) ? reports.data.length : 0,
    problems: problems.error ? 0 : new Set((problems.data ?? []).map((r) => r.booking_id as string)).size,
  };
}
