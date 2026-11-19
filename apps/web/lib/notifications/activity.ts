import {
  Bell,
  Car,
  ChatCircle,
  Confetti,
  Flag,
  Info,
  NavigationArrow,
  PlusCircle,
  SealCheck,
  Crowd,
  ShieldCheck,
  UserFocus,
  UserPlus,
  Wallet,
  XCircle,
} from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
import { notificationRoute } from "./route";
import type { AppNotification } from "./types";

export type ActivityKind =
  | "milestone"
  | "arrived"
  | "started"
  | "paid"
  | "payment_failed"
  | "pay_due"
  | "seat_request"
  | "ride_request"
  | "ride_match"
  | "message"
  | "alert"
  | "published"
  | "booking_update"
  | "ride_update"
  | "verified"
  | "general";

export type ActivityGroup = "trips" | "payments" | "alerts";

export type ActivityTone =
  | "urgent"
  | "celebrate"
  | "opportunity"
  | "done"
  | "calm"
  | "caution"
  | "neutral"
  | "danger";

export type Activity = {
  kind: ActivityKind;
  group: ActivityGroup;
  icon: KipitaIcon;
  tone: ActivityTone;
  label: string;
  action: string | null;
  href: string | null;
  expiresAt: string | null;
  milestone: number | null;
};

type Spec = {
  group: ActivityGroup;
  icon: KipitaIcon;
  tone: ActivityTone;
  label: string;
  action: string | null;
};

const SPEC: Record<ActivityKind, Spec> = {
  milestone: { group: "trips", icon: Confetti, tone: "celebrate", label: "Milestone", action: "See your trips" },
  arrived: { group: "trips", icon: Flag, tone: "done", label: "Trip complete", action: "Rate trip" },
  started: { group: "trips", icon: NavigationArrow, tone: "done", label: "On the road", action: "Follow trip" },
  paid: { group: "payments", icon: ShieldCheck, tone: "done", label: "Payment", action: "View booking" },
  payment_failed: { group: "payments", icon: XCircle, tone: "danger", label: "Payment failed", action: "Try again" },
  pay_due: { group: "payments", icon: Wallet, tone: "urgent", label: "Pay to confirm", action: "Pay now" },
  seat_request: { group: "trips", icon: UserPlus, tone: "opportunity", label: "Seat request", action: "Review request" },
  ride_request: { group: "trips", icon: UserFocus, tone: "opportunity", label: "Ride wanted", action: "Offer a seat" },
  ride_match: { group: "trips", icon: Car, tone: "opportunity", label: "New ride", action: "View ride" },
  message: { group: "trips", icon: ChatCircle, tone: "calm", label: "Message", action: "Reply" },
  alert: { group: "alerts", icon: Crowd, tone: "caution", label: "Road alert", action: "View alert" },
  published: { group: "trips", icon: PlusCircle, tone: "done", label: "Your ride", action: "View ride" },
  booking_update: { group: "trips", icon: Info, tone: "neutral", label: "Booking", action: "View booking" },
  ride_update: { group: "trips", icon: Info, tone: "neutral", label: "Ride", action: "Find another ride" },
  verified: { group: "trips", icon: SealCheck, tone: "done", label: "Verified", action: "See your rides" },
  general: { group: "trips", icon: Bell, tone: "neutral", label: "Kipita", action: null },
};

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function kindOf(n: AppNotification): ActivityKind {
  const d = n.data ?? {};
  if (d.milestone != null) return "milestone";
  switch (n.type) {
    case "trip_completed":
      return "arrived";
    case "trip_started":
      return "started";
    case "payment_success":
      return "paid";
    case "payment_failed":
      return "payment_failed";
    case "request_match":
      return str(d.booking_id) ? "seat_request" : "ride_request";
    case "ride_match":
      return "ride_match";
    case "new_message":
      return "message";
    case "new_alert":
      return "alert";
  }
  if (str(d.expires_at)) return "pay_due";
  if (n.type === "system" && /\bverified\b/i.test(n.title)) return "verified";
  if (str(d.alert_id)) return "alert";
  if (str(d.departure_date) && str(d.trip_id)) return "published";
  if (str(d.booking_id)) return "booking_update";
  if (str(d.trip_id)) return "ride_update";
  return "general";
}

function hrefFor(kind: ActivityKind, n: AppNotification): string | null {
  const d = n.data ?? {};
  if (kind === "ride_request") {
    const q = new URLSearchParams();
    const from = str(d.from);
    const to = str(d.to);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const qs = q.toString();
    return qs ? `/publish?${qs}` : "/publish";
  }
  if (kind === "verified") return "/trips";
  if (kind === "ride_update") return "/home";
  if (kind === "milestone") return "/trips";
  return notificationRoute(n.data);
}

export function activityOf(n: AppNotification): Activity {
  const kind = kindOf(n);
  const spec = SPEC[kind];
  const d = n.data ?? {};
  const milestone = typeof d.milestone === "number" ? d.milestone : Number(d.milestone) || null;
  return {
    kind,
    ...spec,
    href: hrefFor(kind, n),
    expiresAt: kind === "pay_due" ? str(d.expires_at) : null,
    milestone: kind === "milestone" ? milestone : null,
  };
}

export function needsYou(n: AppNotification, now = Date.now()): boolean {
  if (n.read) return false;
  const a = activityOf(n);
  if (a.kind === "seat_request" || a.kind === "payment_failed") return true;
  if (a.kind === "pay_due") return !a.expiresAt || new Date(a.expiresAt).getTime() > now;
  return false;
}
export type DayBucket = { key: string; label: string; items: AppNotification[] };

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function groupByDay(items: AppNotification[], now = Date.now()): DayBucket[] {
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
