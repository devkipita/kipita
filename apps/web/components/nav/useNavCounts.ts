"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/lib/notifications/useNotifications";
import type { AppMode } from "@/lib/home/mode";

export type NavCounts = {
  notifications: number;
  alerts: number;
  trips: number;
};

const SEEN_PREFIX = "kipita-seen:";
const EMPTY: NavCounts = { notifications: 0, alerts: 0, trips: 0 };

function readSeen(key: string): string {
  try {
    const stored = localStorage.getItem(SEEN_PREFIX + key);
    if (stored) return stored;
  } catch {
    /* empty */
  }
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function writeSeen(key: string): void {
  try {
    localStorage.setItem(SEEN_PREFIX + key, new Date().toISOString());
  } catch {
    /* empty */
  }
}

async function countSince(
  table: string,
  since: string,
  excludeColumn?: string,
  excludeId?: string,
): Promise<number> {
  try {
    let query = createClient()
      .from(table)
      .select("id", { count: "exact", head: true })
      .gt("created_at", since);

    if (excludeColumn && excludeId) query = query.neq(excludeColumn, excludeId);

    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export function useNavCounts(
  userId: string | null,
  mode: AppMode,
): NavCounts & { markSeen: (key: "alerts" | "trips") => void } {
  const pathname = usePathname() ?? "/";
  const { unread } = useNotifications(userId ?? "");
  const [counts, setCounts] = useState<NavCounts>(EMPTY);

  const tripTable = mode === "driver" ? "ride_requests" : "trips";
  const ownerColumn = mode === "driver" ? "passenger_id" : "driver_id";

  const refresh = useCallback(async () => {
    if (!userId) {
      setCounts(EMPTY);
      return;
    }

    const [alerts, trips] = await Promise.all([
      countSince("announcements", readSeen("alerts"), "user_id", userId),
      countSince(tripTable, readSeen("trips"), ownerColumn, userId),
    ]);

    setCounts((prev) => ({ ...prev, alerts, trips }));
  }, [userId, tripTable, ownerColumn]);

  const markSeen = useCallback(
    (key: "alerts" | "trips") => {
      writeSeen(key);
      setCounts((prev) => ({ ...prev, [key]: 0 }));
    },
    [],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Visiting a surface clears its badge, and the next count starts from now.
  useEffect(() => {
    if (pathname.startsWith("/alerts")) markSeen("alerts");
    if (pathname === "/home" || pathname.startsWith("/trips")) markSeen("trips");
  }, [pathname, markSeen]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase
      .channel("nav-counts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: tripTable },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, tripTable, refresh]);

  return { ...counts, notifications: unread, markSeen };
}
