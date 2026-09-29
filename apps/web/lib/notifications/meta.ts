import { Car, CheckCircle as CheckCircle2, Flag, Info, Megaphone, ChatCircle as MessageCircle, NavigationArrow as Navigation, UserFocus as UserRoundSearch, XCircle } from "@/components/icons";
import type { KipitaIcon as LucideIcon } from "@/components/icons";
import type { AppTheme, ToneName } from "@/lib/theme";
import type { NotificationType } from "./types";

/** Container tones plus a danger slot the theme keeps outside `tone`. */
export type NotifTone = ToneName | "danger";

type Meta = { icon: LucideIcon; tone: NotifTone; label: string };

/** Icon, tone and short label per notification type (mirrors NOTIF_ICONS on mobile). */
export const NOTIFICATION_META: Record<NotificationType, Meta> = {
  ride_match: { icon: Car, tone: "blue", label: "Ride" },
  request_match: { icon: UserRoundSearch, tone: "lav", label: "Request" },
  payment_success: { icon: CheckCircle2, tone: "mint", label: "Payment" },
  payment_failed: { icon: XCircle, tone: "danger", label: "Payment" },
  trip_started: { icon: Navigation, tone: "amber", label: "Trip" },
  trip_completed: { icon: Flag, tone: "green", label: "Trip" },
  new_message: { icon: MessageCircle, tone: "blue", label: "Message" },
  new_alert: { icon: Megaphone, tone: "tan", label: "Alert" },
  system: { icon: Info, tone: "surface", label: "System" },
};

/** Resolve a notification tone to a background/ink pair from the active theme. */
export function notifToneColors(theme: AppTheme, tone: NotifTone) {
  if (tone === "danger") {
    return { bg: theme.color.dangerBg, on: theme.color.dangerText };
  }
  return { bg: theme.tone[tone].bg, on: theme.tone[tone].on };
}

/** "3m", "5h", "2d" — the compact stamp used on notification rows. */
export function shortRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}
