export type Overview = {
  live_trips: number;
  trips_today: number;
  bookings_today: number;
  seat_value_today: number;
  fees_today: number;
  escrow_held: number;
  open_reports: number;
  safety_reports: number;
  pending_drivers: number;
  pending_refunds: number;
  failed_payouts: number;
  live_routes: { city: string; trips: number }[];
  bookings_per_day: { day: string; count: number }[];
  top_routes: { from: string; to: string; bookings: number; load: number | null }[];
};

export type TripStatus = "posted" | "active" | "in_progress" | "completed" | "cancelled" | "awaiting_approval";

export type TripRow = {
  id: string;
  from: string;
  to: string;
  departure_date: string;
  departure_time: string | null;
  driver_name: string | null;
  driver_avatar: string | null;
  driver_rating: number | null;
  vehicle: string | null;
  plate: string | null;
  vehicle_type: string | null;
  seats_total: number;
  seats_booked: number;
  price_per_seat: number;
  status: TripStatus;
};

export type TripBooking = {
  id: string;
  reference: string | null;
  passenger: string | null;
  avatar: string | null;
  seats: number;
  total: number;
  status: string;
  created_at: string;
  escrow_status: string | null;
  platform_fee: number | null;
  driver_earning: number | null;
  held_at: string | null;
  released_at: string | null;
};

export type TripDetail = {
  id: string;
  from: string;
  to: string;
  departure_date: string;
  departure_time: string | null;
  status: TripStatus;
  price_per_seat: number;
  seats_total: number;
  seats_booked: number;
  created_at: string;
  driver: { name: string | null; avatar: string | null; phone: string | null };
  vehicle: string | null;
  plate: string | null;
  bookings: TripBooking[];
};

export type PaymentTab = "escrow" | "payouts" | "refunds";

export type PaymentRow = {
  id: string;
  reference: string | null;
  passenger: string | null;
  driver: string | null;
  amount: number;
  platform_fee: number | null;
  driver_earning: number | null;
  status: string;
  escrow_status: string | null;
  payout_status: string | null;
  receipt: string | null;
  method: string | null;
  created_at: string;
};

export type Payments = {
  summary: {
    held: number;
    released_today: number;
    refunded_week: number;
    failed_payouts: number;
    pending_refunds: number;
  };
  rows: PaymentRow[];
};

export type UserRole = "all" | "rider" | "driver" | "admin" | "suspended";

export type UserRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  is_verified: boolean;
  rating: number | null;
  total_trips: number | null;
  status: "active" | "suspended" | "banned" | "deleted";
  is_admin: boolean;
  is_driver: boolean;
  created_at: string;
};

export type Paged<T> = { total: number; rows: T[] };

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type Person = { name: string | null; avatar: string | null; phone: string | null };

export type ReportRow = {
  id: string;
  type: "lost_item" | "safety" | "user";
  reason: string | null;
  description: string;
  contact: string | null;
  status: ReportStatus;
  created_at: string;
  reporter: Person;
  reported: Person | null;
  booking: {
    reference: string | null;
    trip_id: string;
    from: string;
    to: string;
    departure_date: string;
    total: number;
  } | null;
};

export type AdminProblemKind =
  | "never_picked_up"
  | "not_dropped_off"
  | "unsafe_driving"
  | "asked_for_cash"
  | "other"
  | "manual_board";

export type ProblemItem = {
  id: string;
  /** A passenger's report, or a driver marking a passenger on board by hand. */
  source: "passenger" | "manual_board";
  kind: AdminProblemKind;
  note: string;
  status: "open" | "resolved";
  outcome: "clear" | "refund" | null;
  resolved_note: string | null;
  created_at: string;
};

/** One booking with everything open (or resolved) on it. Deciding resolves all of it at once. */
export type ProblemRow = {
  booking_id: string;
  reference: string | null;
  booking_status: string;
  boarded_method: "code" | "manual" | "legacy" | null;
  seats: number;
  trip_id: string;
  from: string;
  to: string;
  departure_date: string;
  departure_time: string | null;
  amount: number | null;
  driver_earning: number | null;
  escrow_status: string | null;
  release_due_at: string | null;
  passenger: { id: string; name: string | null; phone: string | null };
  driver: { id: string; name: string | null; phone: string | null };
  opened_at: string;
  resolved_at: string | null;
  problems: ProblemItem[];
};

/** One payment to make (migration 074). "request": money already taken from the wallet. "earnings": a driver's wallet balance. */
export type PayoutLine = {
  kind: "request" | "earnings";
  withdrawal_id: string | null;
  user_id: string;
  name: string | null;
  /** 2547XXXXXXXX, or null when the number on file is not usable. */
  phone: string | null;
  verified: boolean;
  verified_via: string | null;
  amount: number;
  since: string | null;
};

export type PayoutWaitingReason = "account" | "phone" | "minimum";

/** Owed money but cannot be paid yet. */
export type PayoutWaiting = {
  user_id: string;
  name: string | null;
  phone: string | null;
  amount: number;
  reason: PayoutWaitingReason;
  since: string | null;
};

export type PayoutQueue = { min: number; lines: PayoutLine[]; waiting: PayoutWaiting[] };

export type PayoutHistoryRow = {
  id: string;
  name: string | null;
  phone: string | null;
  amount: number;
  status: "paid" | "failed" | "cancelled";
  receipt: string | null;
  reason: string | null;
  at: string | null;
};

export type AuditRow = {
  id: string;
  action: string;
  subject: string | null;
  subject_id: string | null;
  detail: { from?: unknown; to?: unknown; petrol?: unknown; diesel?: unknown; amount?: unknown; receipt?: unknown; reason?: unknown } | null;
  created_at: string;
  actor: string | null;
  actor_avatar: string | null;
};

export function tripCode(id: string) {
  return `KP-${id.slice(0, 6).toUpperCase()}`;
}

export function kes(value: number | null | undefined) {
  return `KES ${Math.round(Number(value ?? 0)).toLocaleString("en-KE")}`;
}

const NAIROBI = "Africa/Nairobi";

export function shortDate(value: string | null | undefined) {
  if (!value) return "";
  const date = value.length === 10 ? new Date(`${value}T00:00:00+03:00`) : new Date(value);
  return date.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: NAIROBI });
}

export function shortTime(value: string | null | undefined) {
  if (!value) return "";
  if (/^\d{2}:\d{2}/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
  }
  return new Date(value).toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit", timeZone: NAIROBI });
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "";
  return `${shortDate(value)} · ${shortTime(value)}`;
}

export function ago(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days`;
}

export const SETTING_LABELS: Record<string, string> = {
  platform_fee_percent: "Kipita service fee",
  fee_on_top: "Fee on top of the seat price",
  fee_min_kes: "Smallest fee per booking",
  hold_minutes: "Payment hold window",
  fuel_cost_per_km: "Fuel cost per km (no longer used)",
  fare_margin_percent: "Fare headroom (price cap)",
  fare_wear_per_km: "Wear and tear per km",
  fare_min_seat_price: "Lowest seat price",
  fare_floor_percent: "Price floor (share of recommended)",
  fare_round_step: "Seat price rounding step",
  cancel_free_hours: "Free cancellation closes before departure",
  cancel_grace_minutes: "Free cancellation after paying",
  cancel_late_refund_percent: "Late cancellation refund",
  no_show_wait_minutes: "Wait before a no-show can be reported",
  no_show_dispute_hours: "Time to dispute a no-show",
};

export function describeAction(row: AuditRow) {
  const from = row.detail?.from;
  const to = row.detail?.to;
  switch (row.action) {
    case "setting.update":
      return `Changed ${SETTING_LABELS[row.subject_id ?? ""] ?? row.subject_id} from ${String(from ?? "unset")} to ${String(to)}`;
    case "fuel.add": {
      const d = row.detail ?? {};
      const parts = [d.petrol ? `petrol ${String(d.petrol)}` : null, d.diesel ? `diesel ${String(d.diesel)}` : null].filter(Boolean);
      return `Entered ${String(row.subject_id ?? "")} fuel prices for ${String(d.from ?? "")} to ${String(d.to ?? "")}: ${parts.join(", ")}`;
    }
    case "vehicle_class.update":
      return `Set ${row.subject_id} to ${String(to)} km per litre (was ${String(from)})`;
    case "flag.update":
      return `${to ? "Turned on" : "Turned off"} ${row.subject_id}`;
    case "driver.approval":
      return `Set driver approval to ${String(to ?? row.detail?.to ?? "")}`.trim();
    case "user.status":
      return `Changed user status from ${String(from)} to ${String(to)}`;
    case "report.status":
      return `Moved case from ${String(from)} to ${String(to)}`;
    case "payout.paid":
      return `Marked KES ${String(row.detail?.amount ?? "")} paid, receipt ${String(row.detail?.receipt ?? "")}`;
    case "payout.returned":
      return `Returned KES ${String(row.detail?.amount ?? "")} to the wallet: ${String(row.detail?.reason ?? "")}`;
    default:
      return row.action;
  }
}
