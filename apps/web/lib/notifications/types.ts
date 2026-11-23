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

export type NotificationData = {
  trip_id?: string;
  request_id?: string;
  booking_id?: string;
  conversation_id?: string;
  alert_id?: string;
  from?: string;
  to?: string;
  type?: NotificationType;
  expires_at?: string;
  milestone?: number | string;
  seats?: number | string;
  reminder?: "pay" | "departure";
  approval_status?: string;
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
