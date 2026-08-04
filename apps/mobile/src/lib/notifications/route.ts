/**
 * Resolve a notification's payload to the in-app route its tap should open.
 *
 * Shared by both the push-notification handler (cold-start / background taps)
 * and the in-app notifications list, so a tap behaves identically no matter
 * where it originates. Returns `null` when a notification has no actionable
 * target (e.g. `system` messages) — callers decide the fallback.
 */
export function notificationRoute(
  data: Record<string, any> | null | undefined,
): string | null {
  if (!data) return null;
  if (data.booking_id) return `/trip/${data.booking_id}`;
  if (data.conversation_id) return `/chat/${data.conversation_id}`;
  if (data.alert_id) return `/alert/${data.alert_id}`;
  if (data.trip_id) return `/ride/${data.trip_id}`;
  if (data.request_id) return `/ride/${data.request_id}`;
  return null;
}
