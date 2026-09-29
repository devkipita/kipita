import {
  CheckCircle,
  Checks,
  NavigationArrow,
  Wallet,
  XCircle,
} from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
import type { AppTheme, Tone } from "@/lib/theme";
import type { BookingStatus } from "@/lib/trips/types";

/**
 * Booking status → M3 role pair, the web port of
 * `apps/mobile/src/theme/statusTone.ts`. Statuses map onto the semantic role
 * families the theme already defines, never arbitrary hues.
 */
export interface StatusTone extends Tone {
  container: string;
  onContainer: string;
}

export function statusTone(theme: AppTheme, status: BookingStatus): StatusTone {
  const c = theme.color;
  switch (status) {
    case "pending_payment":
      return {
        bg: c.warning,
        on: c.onWarning,
        container: c.warningContainer,
        onContainer: c.onWarningContainer,
      };
    case "in_progress":
      return {
        bg: c.info,
        on: c.onInfo,
        container: c.infoContainer,
        onContainer: c.onInfoContainer,
      };
    case "completed":
      return {
        bg: c.success,
        on: c.onSuccess,
        container: c.successContainer,
        onContainer: c.onSuccessContainer,
      };
    case "cancelled":
      return {
        bg: c.error,
        on: c.onError,
        container: c.errorContainer,
        onContainer: c.onErrorContainer,
      };
    case "confirmed":
    default:
      return {
        bg: c.primary,
        on: c.onPrimary,
        container: c.primaryContainer,
        onContainer: c.onPrimaryContainer,
      };
  }
}

export const STATUS_ICON: Record<BookingStatus, KipitaIcon> = {
  pending_payment: Wallet,
  confirmed: CheckCircle,
  in_progress: NavigationArrow,
  completed: Checks,
  cancelled: XCircle,
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_payment: "Payment due",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
