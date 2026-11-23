/**
 * When a road alert counts as cleared, in one place.
 *
 * Every web screen that asks goes through here: the feed sort, the trending-roads list and the
 * Cleared label on cards and the alert page. The Android and iOS app keeps its own copy of the
 * same rule (AlertRules.kt, `CLEARED_THRESHOLD`), so change the two together.
 */

/** Cleared votes it takes to close an alert. */
export const CLEARED_THRESHOLD = 3;

export type AlertStatus = "active" | "unconfirmed" | "cleared";

/** The two vote counts the rule reads, as they sit on an alert row. */
export type AlertVotes = { confirms_count: number; cleared_count: number };

/**
 * Cleared once enough people say so, whatever the Still there count. Otherwise active when one
 * person has confirmed it, otherwise unconfirmed.
 */
export function alertStatus(votes: AlertVotes): AlertStatus {
  if (votes.cleared_count >= CLEARED_THRESHOLD) return "cleared";
  if (votes.confirms_count >= 1) return "active";
  return "unconfirmed";
}

/** How many more Cleared votes close the alert; 0 once it is closed. */
export function clearedVotesLeft(votes: Pick<AlertVotes, "cleared_count">): number {
  return Math.max(0, CLEARED_THRESHOLD - votes.cleared_count);
}
