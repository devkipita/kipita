/**
 * Notification shapes — mirrors `public.notifications` (migration 001) and the
 * mobile app's `AppNotification`, so a row written by any client/trigger reads
 * identically on web.
 */

export type NotificationType =
  | "ride_match"
  | "request_match"
  | "payment_success"
  | "payment_failed"
  | "trip_started"
  | "trip_completed"
  | "new_message"
  | "new_alert"
  | "system";

/** The JSONB payload carried by a notification — see `notificationRoute`. */
export type NotificationData = {
  trip_id?: string;
  request_id?: string;
  booking_id?: string;
  conversation_id?: string;
  alert_id?: string;
  from?: string;
  to?: string;
  type?: NotificationType;
} & Record<string, unknown>;

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData | null;
  read: boolean;
  created_at: string;
}

export const NOTIFICATION_COLUMNS =
  "id, user_id, type, title, body, data, read, created_at";

/** Which tab a notification belongs to in the inbox. */
export type NotificationTab = "rides" | "updates" | "system";

/** Ride offers and passenger requests — the "available rides" feed. */
const RIDE_TYPES: NotificationType[] = ["ride_match", "request_match"];

export function tabForNotification(n: AppNotification): NotificationTab {
  if (n.type === "system") return "system";
  return RIDE_TYPES.includes(n.type) ? "rides" : "updates";
}
