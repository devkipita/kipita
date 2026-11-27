import type { NotificationData } from "./types";

export function notificationRoute(
  data: NotificationData | null | undefined,
): string | null {
  if (!data) return null;
  if (typeof data.booking_id === "string") {
    return `/trips/${data.booking_id}${typeof data.conversation_id === "string" ? "?chat=1" : ""}`;
  }
  if (typeof data.trip_id === "string") return `/ride/${data.trip_id}`;
  if (typeof data.request_id === "string") {
    return `/ride/${data.request_id}?kind=request`;
  }
  if (typeof data.alert_id === "string") return `/alerts/${data.alert_id}`;
  return null;
}
