"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { activityOf, bookingOf } from "@/lib/notifications/activity";
import type { AppNotification } from "@/lib/notifications/types";
import { openSeatRequestIdsAction } from "@/lib/trips/request-actions";

export type SeatOutcome = "accepted" | "declined" | "gone";

let answered: ReadonlyMap<string, SeatOutcome> = new Map();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function settleSeatRequest(bookingId: string, outcome: SeatOutcome): void {
  if (answered.get(bookingId) === outcome) return;
  answered = new Map([...answered, [bookingId, outcome]]);
  for (const listener of listeners) listener();
}

const NONE: ReadonlySet<string> = new Set();
const EMPTY: ReadonlyMap<string, SeatOutcome> = new Map();

export function useSeatOutcome(bookingId: string | null): SeatOutcome | null {
  const all = useSyncExternalStore(subscribe, () => answered, () => EMPTY);
  return bookingId ? (all.get(bookingId) ?? null) : null;
}

export function useOpenSeatRequests(items: AppNotification[], active = true): ReadonlySet<string> {
  const key = useMemo(() => {
    const ids = new Set<string>();
    for (const n of items) {
      const booking = bookingOf(n);
      if (booking && activityOf(n).kind === "seat_request") ids.add(booking);
    }
    return Array.from(ids).sort().join(",");
  }, [items]);

  const done = useSyncExternalStore(subscribe, () => answered, () => EMPTY);
  const [open, setOpen] = useState<ReadonlySet<string>>(NONE);

  useEffect(() => {
    if (!key || !active) {
      if (!key) setOpen(NONE);
      return;
    }
    let live = true;
    openSeatRequestIdsAction(key.split(","))
      .then((ids) => {
        if (live) setOpen(new Set(ids ?? []));
      })
      .catch(() => {
        if (live) setOpen(NONE);
      });
    return () => {
      live = false;
    };
  }, [key, active]);

  return useMemo(() => {
    if (done.size === 0) return open;
    return new Set([...open].filter((id) => !done.has(id)));
  }, [open, done]);
}
