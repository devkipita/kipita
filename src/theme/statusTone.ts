/**
 * Booking-status → Material 3 colour-role mapping.
 *
 * A single source of truth so the trips list, the live trip screen and any
 * future surface all speak the same colour language for a booking's state.
 *
 * Following the M3 colour-roles model (https://m3.material.io/styles/color/roles),
 * each status resolves to a small role set:
 *   • container / onContainer — the low-emphasis tonal fill used for large
 *     areas (cards, hero banners). Readable, calm, never shouty.
 *   • accent   / onAccent     — the high-emphasis role for the status itself
 *     (status dots, progress tracks, badges, the "live" pulse).
 *
 * Statuses are deliberately mapped onto the *semantic* role families the theme
 * already defines rather than arbitrary hues, so light/dark and future
 * re-theming stay consistent:
 *   pending_payment → warning   (amber — needs the user to act)
 *   confirmed       → primary   (brand green — booked & ready)
 *   in_progress     → info      (blue — live / on the move)
 *   completed       → success   (green — done)
 *   cancelled       → error     (red — cancelled)
 */

import type { M3Colors } from "./colors";
import type { BookingStatus } from "@/types";
import type { IconName } from "@/components/core/Icon";

export interface StatusTone {
  /** High-emphasis status colour (dots, tracks, badges, live pulse). */
  accent: string;
  /** Foreground that sits on top of `accent`. */
  onAccent: string;
  /** Low-emphasis tonal fill for large areas (cards, banners). */
  container: string;
  /** Foreground that sits on top of `container`. */
  onContainer: string;
}

export function statusTone(colors: M3Colors, status: BookingStatus): StatusTone {
  switch (status) {
    case "pending_payment":
      return {
        accent: colors.warning,
        onAccent: colors.onWarning,
        container: colors.warningContainer,
        onContainer: colors.onWarningContainer,
      };
    case "in_progress":
      return {
        accent: colors.info,
        onAccent: colors.onInfo,
        container: colors.infoContainer,
        onContainer: colors.onInfoContainer,
      };
    case "completed":
      return {
        accent: colors.success,
        onAccent: colors.onSuccess,
        container: colors.successContainer,
        onContainer: colors.onSuccessContainer,
      };
    case "cancelled":
      return {
        accent: colors.error,
        onAccent: colors.onError,
        container: colors.errorContainer,
        onContainer: colors.onErrorContainer,
      };
    case "confirmed":
    default:
      return {
        accent: colors.primary,
        onAccent: colors.onPrimary,
        container: colors.primaryContainer,
        onContainer: colors.onPrimaryContainer,
      };
  }
}

/** Filled glyph per status — used on badges / hero icons. */
export const STATUS_ICON: Record<BookingStatus, IconName> = {
  pending_payment: "card-outline",
  confirmed: "checkmark-circle",
  in_progress: "navigate",
  completed: "checkmark-done-circle",
  cancelled: "close-circle",
};

/** i18n key for the human label of each status. */
export const STATUS_LABEL_KEY: Record<BookingStatus, string> = {
  pending_payment: "status_pending",
  confirmed: "status_confirmed",
  in_progress: "status_in_progress",
  completed: "status_completed",
  cancelled: "status_cancelled",
};
