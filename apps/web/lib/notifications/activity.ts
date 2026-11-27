import {
  Bell,
  Car,
  ChatCircle,
  Clock,
  Confetti,
  Crowd,
  Flag,
  Info,
  NavigationArrow,
  PlusCircle,
  SealCheck,
  ShieldCheck,
  UserFocus,
  UserPlus,
  Wallet,
  Warning,
  XCircle,
} from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
import { notificationRoute } from "./route";
import type { AppNotification } from "./types";

export type ActivityKind =
  | "milestone"
  | "arrived"
  | "started"
  | "departing"
  | "paid"
  | "wallet"
  | "payment_failed"
  | "pay_due"
  | "seat_request"
  | "ride_request"
  | "ride_match"
  | "message"
  | "alert"
  | "published"
  | "cancelled"
  | "booking_update"
  | "ride_update"
  | "verified"
  | "verify_failed"
  | "general";

export type ActivityGroup = "trips" | "payments" | "alerts";

export type ActivityRole =
  | "primary"
  | "secondary"
  | "tertiary"
  | "success"
  | "warning"
  | "info"
  | "error"
  | "lime"
  | "neutral";

export type Activity = {
  kind: ActivityKind;
  group: ActivityGroup;
  icon: KipitaIcon;
  role: ActivityRole;
  label: string;
  action: string | null;
  href: string | null;
  expiresAt: string | null;
  milestone: number | null;
  seats: number | null;
};

type Spec = {
  group: ActivityGroup;
  icon: KipitaIcon;
  role: ActivityRole;
  label: string;
  action: string | null;
};

const SPEC: Record<ActivityKind, Spec> = {
  milestone: { group: "trips", icon: Confetti, role: "tertiary", label: "Milestone", action: "See your trips" },
  arrived: { group: "trips", icon: Flag, role: "success", label: "Trip complete", action: "Rate trip" },
  started: { group: "trips", icon: NavigationArrow, role: "lime", label: "On the road", action: "Follow trip" },
  departing: { group: "trips", icon: Clock, role: "info", label: "Leaving soon", action: "View booking" },
  paid: { group: "payments", icon: ShieldCheck, role: "success", label: "Payment", action: "View booking" },
  wallet: { group: "payments", icon: Wallet, role: "success", label: "Wallet", action: "Open wallet" },
  payment_failed: { group: "payments", icon: XCircle, role: "error", label: "Payment failed", action: "Try again" },
  pay_due: { group: "payments", icon: Wallet, role: "warning", label: "Pay to confirm", action: "Pay now" },
  seat_request: { group: "trips", icon: UserPlus, role: "secondary", label: "Seat request", action: "Review request" },
  ride_request: { group: "trips", icon: UserFocus, role: "secondary", label: "Ride wanted", action: "Offer a seat" },
  ride_match: { group: "trips", icon: Car, role: "primary", label: "New ride", action: "View ride" },
  message: { group: "trips", icon: ChatCircle, role: "info", label: "Message", action: "Reply" },
  alert: { group: "alerts", icon: Crowd, role: "tertiary", label: "Road alert", action: "View alert" },
  published: { group: "trips", icon: PlusCircle, role: "primary", label: "Your ride", action: "View ride" },
  cancelled: { group: "trips", icon: XCircle, role: "error", label: "Cancelled", action: "View booking" },
  booking_update: { group: "trips", icon: Info, role: "neutral", label: "Booking", action: "View booking" },
  ride_update: { group: "trips", icon: Info, role: "neutral", label: "Ride", action: "Find another ride" },
  verified: { group: "trips", icon: SealCheck, role: "success", label: "Verified", action: "See your rides" },
  verify_failed: { group: "trips", icon: Warning, role: "warning", label: "Verification", action: "Send your details" },
  general: { group: "trips", icon: Bell, role: "neutral", label: "Kipita", action: null },
};

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

const STOPPED = /\b(cancel(l)?ed|declined|not available|ran out|has left|didn't pay|did not pay)\b/i;

function kindOf(n: AppNotification): ActivityKind {
  const d = n.data ?? {};
  if (d.milestone != null) return "milestone";
  if (str(d.expires_at) && str(d.booking_id)) return "pay_due";
  switch (n.type) {
    case "trip_completed":
      return "arrived";
    case "trip_started":
      return "started";
    case "payment_success":
      return str(d.booking_id) ? "paid" : "wallet";
    case "payment_failed":
      return "payment_failed";
    case "request_match":
      return str(d.booking_id) ? "seat_request" : "ride_request";
    case "ride_match":
      return str(d.booking_id) ? "paid" : "ride_match";
    case "new_message":
      return "message";
    case "new_alert":
      return "alert";
  }
  if (str(d.expires_at)) return "pay_due";
  if (d.reminder === "departure") return "departing";
  if (str(d.approval_status)) return d.approval_status === "approved" ? "verified" : "verify_failed";
  if (n.type === "system" && /\bverified\b/i.test(n.title)) return "verified";
  if (str(d.alert_id)) return "alert";
  if (STOPPED.test(n.title)) return "cancelled";
  if (d.amount != null || str(d.topup_id) || str(d.withdrawal_id) || str(d.referral_id)) return "wallet";
  if (str(d.departure_date) && str(d.trip_id)) return "published";
  if (str(d.booking_id)) return "booking_update";
  if (str(d.trip_id)) return "ride_update";
  return "general";
}

function hrefFor(kind: ActivityKind, n: AppNotification): string | null {
  const d = n.data ?? {};
  const booking = str(d.booking_id);
  switch (kind) {
    case "ride_request": {
      const q = new URLSearchParams();
      const from = str(d.from);
      const to = str(d.to);
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const qs = q.toString();
      return qs ? `/publish?${qs}` : "/publish";
    }
    case "pay_due":
      return booking ? `/trips/${booking}?pay=1` : notificationRoute(d);
    case "wallet":
      return booking ? `/trips/${booking}` : "/wallet";
    case "payment_failed":
      if (booking) return `/trips/${booking}?pay=1`;
      return str(d.topup_id) || str(d.withdrawal_id) ? "/wallet" : null;
    case "verified":
    case "milestone":
      return "/trips";
    case "verify_failed":
      return "/publish";
    case "cancelled":
      return booking ? `/trips/${booking}` : "/home";
    case "ride_update":
      return "/home";
    default:
      return notificationRoute(d);
  }
}

function positive(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function activityOf(n: AppNotification): Activity {
  const kind = kindOf(n);
  const spec = SPEC[kind];
  const d = n.data ?? {};
  return {
    kind,
    ...spec,
    href: hrefFor(kind, n),
    expiresAt: kind === "pay_due" ? str(d.expires_at) : null,
    milestone: kind === "milestone" ? positive(d.milestone) : null,
    seats: kind === "seat_request" ? positive(d.seats) : null,
  };
}

export function holdOpen(a: Activity, now: number): boolean {
  return !a.expiresAt || new Date(a.expiresAt).getTime() > now;
}

const SETTLES = new Set<ActivityKind>(["paid", "cancelled", "started", "arrived"]);

export function settledBookings(items: AppNotification[]): ReadonlySet<string> {
  const out = new Set<string>();
  for (const n of items) {
    const booking = str(n.data?.booking_id);
    if (booking && SETTLES.has(kindOf(n))) out.add(booking);
  }
  return out;
}

export function bookingOf(n: AppNotification): string | null {
  return str(n.data?.booking_id);
}

export function needsYou(n: AppNotification, now: number, settled: ReadonlySet<string>): boolean {
  if (n.read) return false;
  const a = activityOf(n);
  if (a.kind === "seat_request" || a.kind === "payment_failed") return true;
  if (a.kind === "pay_due") {
    const booking = bookingOf(n);
    return holdOpen(a, now) && !(booking && settled.has(booking));
  }
  return false;
}

export type DayBucket = { key: string; label: string; items: AppNotification[] };

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function groupByDay(items: AppNotification[], now: number): DayBucket[] {
  const today = startOfDay(now);
  const yesterday = today - 86_400_000;
  const week = today - 6 * 86_400_000;
  const order: DayBucket[] = [
    { key: "today", label: "Today", items: [] },
    { key: "yesterday", label: "Yesterday", items: [] },
    { key: "week", label: "This week", items: [] },
    { key: "earlier", label: "Earlier", items: [] },
  ];
  for (const n of items) {
    const t = new Date(n.created_at).getTime();
    const slot = t >= today ? 0 : t >= yesterday ? 1 : t >= week ? 2 : 3;
    order[slot].items.push(n);
  }
  return order.filter((b) => b.items.length > 0);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
