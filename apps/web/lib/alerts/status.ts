import type { Alert } from "./types";

export const CLEARED_THRESHOLD = 3;

export type AlertStatus = "active" | "unconfirmed" | "cleared";

export function alertStatus(alert: Pick<Alert, "confirms_count" | "cleared_count">): AlertStatus {
  if (alert.cleared_count >= CLEARED_THRESHOLD) return "cleared";
  if (alert.confirms_count >= 1) return "active";
  return "unconfirmed";
}

export const STATUS_LABEL: Record<AlertStatus, string> = {
  active: "Active",
  unconfirmed: "Unconfirmed",
  cleared: "Cleared",
};

export type Freshness = "fresh" | "recent" | "stale";

export function freshness(createdAt: string, now = Date.now()): Freshness {
  const age = now - new Date(createdAt).getTime();
  if (Number.isNaN(age)) return "stale";
  if (age < 30 * 60 * 1000) return "fresh";
  if (age < 2 * 60 * 60 * 1000) return "recent";
  return "stale";
}

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: "Just reported",
  recent: "Reported recently",
  stale: "Older report",
};

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

export type SortKey = "newest" | "confirmed" | "closest";

export const SORT_LABEL: Record<SortKey, string> = {
  newest: "Newest",
  confirmed: "Most confirmed",
  closest: "Closest",
};

export function sortAlerts(alerts: Alert[], key: SortKey): Alert[] {
  const out = [...alerts];

  out.sort((a, b) => {
    // A cleared alert has stopped being news. It sinks regardless of the sort.
    const aCleared = alertStatus(a) === "cleared" ? 1 : 0;
    const bCleared = alertStatus(b) === "cleared" ? 1 : 0;
    if (aCleared !== bCleared) return aCleared - bCleared;

    if (key === "confirmed" && a.confirms_count !== b.confirms_count) {
      return b.confirms_count - a.confirms_count;
    }

    if (key === "closest") {
      const ad = a.distance_km ?? Number.POSITIVE_INFINITY;
      const bd = b.distance_km ?? Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return out;
}
