import type { NotificationData } from "./types";

/**
 * Resolve a notification's payload to the web route its tap should open.
 *
 * The web counterpart of `apps/mobile/src/lib/notifications/route.ts`. Shared by
 * the inbox, the toast and the browser-notification click handler so a tap
 * behaves identically wherever it originates.
 *
 * Returns `null` when nothing on web can show the target yet — `system`
 * messages have no target at all, and bookings and chat still live only in the
 * app. Callers render those rows as non-navigating.
 */
export function notificationRoute(
  data: NotificationData | null | undefined,
): string | null {
  if (!data) return null;
  if (typeof data.trip_id === "string") return `/ride/${data.trip_id}`;
  if (typeof data.request_id === "string") {
    return `/ride/${data.request_id}?kind=request`;
  }
  if (typeof data.alert_id === "string") return `/alerts/${data.alert_id}`;
  return null;
}
