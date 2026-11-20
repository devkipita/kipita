"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { pickUnseen, unseenWindowStart } from "@kipita/shared";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/lib/notifications/useNotifications";
import { ALERT_VIEWED_EVENT } from "@/lib/alerts/api";
import { unseenAlertStore, useUnseenAlertCount } from "@/lib/alerts/unseen";
import { ping } from "@/lib/notifications/ping";
import type { AppMode } from "@/lib/home/mode";

type SeenKey = "rides" | "requests";
type Fresh = Record<SeenKey, number>;

const SEEN_PREFIX = "kipita-seen:";
const NONE: Fresh = { rides: 0, requests: 0 };
const SEEN_ON: Record<SeenKey, string> = { rides: "/home", requests: "/publish" };

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

async function unseenAlerts(userId: string): Promise<string[]> {
  try {
    const supabase = createClient();
    const since = unseenWindowStart(Date.now()).toISOString();
    const { data: recent, error } = await supabase
      .from("announcements")
      .select("id")
      .gt("created_at", since)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !recent?.length) return [];
    const ids = recent.map((a) => a.id as string);
    const { data: seen, error: seenError } = await supabase
      .from("alert_views")
      .select("alert_id")
      .eq("user_id", userId)
      .in("alert_id", ids);
    if (seenError) return [];
    return pickUnseen(ids, (seen ?? []).map((v) => v.alert_id as string));
  } catch {
    return [];
  }
}

export function useNavCounts(
  userId: string | null,
  mode: AppMode,
): { notifications: number; alerts: number } & Fresh {
  const pathname = usePathname() ?? "/";
  const { unread } = useNotifications(userId ?? "");
  const alerts = useUnseenAlertCount();
  const [fresh, setFresh] = useState<Fresh>(NONE);
  const here = useRef(pathname);
  here.current = pathname;

  const driver = mode === "driver";

  const refresh = useCallback(async () => {
    if (!userId) {
      setFresh(NONE);
      unseenAlertStore.reset();
      return;
    }

    const [alertIds, rides, requests] = await Promise.all([
      unseenAlerts(userId),
      countSince("trips", readSeen("rides"), "driver_id", userId),
      driver ? countSince("ride_requests", readSeen("requests"), "passenger_id", userId) : Promise.resolve(0),
    ]);

    const onPage = (key: SeenKey) => here.current === SEEN_ON[key];
    unseenAlertStore.replace(alertIds);
    setFresh({ rides: onPage("rides") ? 0 : rides, requests: onPage("requests") ? 0 : requests });
  }, [userId, driver]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    for (const key of Object.keys(SEEN_ON) as SeenKey[]) {
      if (pathname !== SEEN_ON[key]) continue;
      writeSeen(key);
      setFresh((prev) => (prev[key] ? { ...prev, [key]: 0 } : prev));
    }
  }, [pathname]);

  useEffect(() => {
    const onViewed = (e: Event) => {
      unseenAlertStore.markSeen((e as CustomEvent<string>).detail);
    };
    window.addEventListener(ALERT_VIEWED_EVENT, onViewed);
    return () => window.removeEventListener(ALERT_VIEWED_EVENT, onViewed);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase
      .channel("nav-counts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        ({ new: row }) => {
          const alert = row as { id: string; user_id: string; location?: string; content?: string };
          if (alert.user_id !== userId) {
            ping({
              title: alert.location ? `Road alert: ${alert.location}` : "New road alert",
              body: alert.content,
              tag: alert.id,
              href: `/alerts/${alert.id}`,
            });
          }
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trips" },
        () => void refresh(),
      );
    if (driver) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_requests" },
        () => void refresh(),
      );
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, driver, refresh]);

  return { ...fresh, alerts, notifications: unread };
}
