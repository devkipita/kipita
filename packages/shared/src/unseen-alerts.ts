/**
 * Which road alerts count as unread, and one small store that holds the answer so the nav badge and
 * the feed always agree.
 *
 * An alert is unread for a signed-in person when it is from the last 7 days, was written by someone
 * else, and they have not opened it (no row in alert_views). Opening an alert records the view.
 *
 * The web app and the Kotlin app must use the same window, so it lives here.
 */

export const UNSEEN_ALERT_WINDOW_DAYS = 7;

const DAY_MS = 86_400_000;

/** Alerts created after this instant can count as unread. */
export function unseenWindowStart(now: Date | number): Date {
  const t = typeof now === "number" ? now : now.getTime();
  return new Date(t - UNSEEN_ALERT_WINDOW_DAYS * DAY_MS);
}

/** The recent alert ids the person has not viewed, in the order given. */
export function pickUnseen(recentIds: readonly string[], viewedIds: Iterable<string>): string[] {
  const viewed = new Set(viewedIds);
  return recentIds.filter((id) => !viewed.has(id));
}

export type UnseenAlertStore = {
  /** The same Set instance until the contents change, so it is safe for useSyncExternalStore. */
  getSnapshot(): ReadonlySet<string>;
  has(id: string): boolean;
  /**
   * Replace the whole set after a fresh fetch. Alerts opened since the page loaded stay cleared, even
   * if a fetch that started before they were opened finishes after. Does nothing, and tells nobody,
   * if the result is unchanged.
   */
  replace(ids: Iterable<string>): void;
  /** The person opened this alert. Remembered, so it also holds if the first fetch is still running. */
  markSeen(id: string): void;
  /** Forget everything: for sign-out, so the next person starts clean. */
  reset(): void;
  subscribe(listener: () => void): () => void;
};

export function createUnseenAlertStore(): UnseenAlertStore {
  let current: ReadonlySet<string> = new Set();
  const opened = new Set<string>();
  const listeners = new Set<() => void>();

  const publish = (next: ReadonlySet<string>) => {
    current = next;
    // Copy first: a listener may unsubscribe while we are notifying.
    for (const listener of [...listeners]) listener();
  };

  const sameAsCurrent = (next: ReadonlySet<string>) =>
    next.size === current.size && [...next].every((id) => current.has(id));

  return {
    getSnapshot: () => current,
    has: (id) => current.has(id),
    replace(ids) {
      const next = new Set([...ids].filter((id) => !opened.has(id)));
      if (!sameAsCurrent(next)) publish(next);
    },
    markSeen(id) {
      opened.add(id);
      if (!current.has(id)) return;
      const next = new Set(current);
      next.delete(id);
      publish(next);
    },
    reset() {
      opened.clear();
      if (current.size > 0) publish(new Set());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
