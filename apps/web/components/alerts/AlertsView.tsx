"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import {
  Clock,
  Crosshair,
  Megaphone,
  ArrowClockwise as RotateCw,
  SealCheck,
} from "@/components/icons";
import { ButtonEl } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { fetchAlerts } from "@/lib/alerts/api";
import { ALERT_META } from "@/lib/alerts/meta";
import {
  SORT_LABEL,
  sortAlerts,
  type SortKey,
} from "@/lib/alerts/status";
import {
  requestPreciseLocation,
  withDistance,
} from "@/lib/alerts/location";
import { detectOrigin } from "@/lib/home/geo";
import type { Alert } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import { AlertCard } from "./AlertCard";
import { AlertComposerInline } from "./AlertComposerInline";

type Tab = "nearby" | "route" | "following" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "nearby", label: "Nearby" },
  { key: "route", label: "My route" },
  { key: "following", label: "Following" },
  { key: "all", label: "All Kenya" },
];

const Wrap = styled.div`
  padding-bottom: 40px;
`;

const TabBar = styled.div`
  position: sticky;
  top: var(--sticky-top, 0px);
  z-index: 5;
  display: flex;
  background: ${({ theme }) => theme.color.bg}f2;
  backdrop-filter: saturate(1.2) blur(10px);
  border-bottom: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  overflow-x: auto;
  scrollbar-width: none;
  scroll-padding-inline: 16px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1 0 auto;
  min-height: 48px;
  padding: 0 18px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.color.text : theme.color.muted};
  cursor: pointer;
  position: relative;
  white-space: nowrap;

  &::after {
    content: "";
    position: absolute;
    left: 18px;
    right: 18px;
    bottom: 0;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ theme, $active }) =>
      $active ? theme.color.primary : "transparent"};
  }

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 2px 10px;
  flex-wrap: wrap;

  h1 {
    margin: 0;
    font-size: 1.28rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: ${({ theme }) => theme.color.text};
  }
  .count {
    margin: 2px 0 0;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const Sorts = styled.div`
  display: flex;
  gap: 4px;
`;

const SortButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? "transparent" : theme.color.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.xs};
  background: ${({ theme, $active }) =>
    $active ? theme.color.secondaryContainer : "transparent"};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onSecondaryContainer : theme.color.onSurfaceVariant};
  font: inherit;
  font-size: 0.85rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  svg {
    flex: none;
    color: currentColor;
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.color.onSurface};
    border-color: ${({ theme }) => theme.color.outline};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Feed = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
`;

const ShowNew = styled.button`
  width: 100%;
  min-height: 48px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.color.outlineVariant};
  background: transparent;
  color: ${({ theme }) => theme.color.primary};
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceContainerLow};
  }
`;

const Empty = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 40px 4px;
  color: ${({ theme }) => theme.color.textSoft};

  svg {
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
  b {
    display: block;
    font-size: 1rem;
    font-weight: 800;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 3px 0 0;
    max-width: 65ch;
    font-size: 0.9rem;
    line-height: 1.45;
  }
`;

const More = styled.div`
  display: flex;
  justify-content: center;
  padding: 20px 0;
`;

const PAGE = 20;

const SORT_ICON: Record<SortKey, typeof Clock> = {
  newest: Clock,
  confirmed: SealCheck,
  closest: Crosshair,
};

export function AlertsView({
  initialAlerts,
  profile,
  followingIds,
  routeTowns,
}: {
  initialAlerts: Alert[];
  profile: Profile | null;
  followingIds: string[];
  routeTowns: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim().toLowerCase();
  const viewerId = profile?.id ?? null;

  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [status, setStatus] = useState<"ready" | "loading" | "error">("ready");
  const [exhausted, setExhausted] = useState(initialAlerts.length < PAGE);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Alerts that arrived while the user was reading. They are held here rather
  // than spliced into the feed, so nothing they are mid-way through moves.
  const [pending, setPending] = useState<Alert[]>([]);
  const topRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<Alert[]>(initialAlerts);
  alertsRef.current = alerts;

  const load = useCallback(
    async (offset = 0) => {
      setStatus("loading");
      try {
        const next = await fetchAlerts(createClient(), {
          offset,
          limit: PAGE,
          viewerId,
        });
        setAlerts((prev) => (offset === 0 ? next : [...prev, ...next]));
        setExhausted(next.length < PAGE);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    },
    [viewerId],
  );

  /**
   * Stale-while-revalidate. Rows already on screen are refreshed in place, so
   * counts and your own votes stay current. Rows that did not exist at last
   * render go to `pending` instead of the feed — appending them would shift
   * whatever the reader is looking at.
   */
  const revalidate = useCallback(async () => {
    try {
      const fresh = await fetchAlerts(createClient(), { limit: PAGE, viewerId });
      const known = new Set(alertsRef.current.map((a) => a.id));

      setAlerts((prev) => {
        const byId = new Map(fresh.map((a) => [a.id, a]));
        return prev.map((a) => byId.get(a.id) ?? a);
      });

      const arrivals = fresh.filter((a) => !known.has(a.id));
      if (arrivals.length > 0) {
        setPending((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...arrivals.filter((a) => !seen.has(a.id)), ...prev];
        });
      }
    } catch {
      // A failed background refresh must never disturb what is on screen.
    }
  }, [viewerId]);

  // The server render cannot know the viewer's own votes, so correct them once.
  useEffect(() => {
    if (!viewerId) return;
    void load(0);
  }, [viewerId, load]);

  useEffect(() => {
    const onFocus = () => void revalidate();
    const onVisible = () => {
      if (document.visibilityState === "visible") void revalidate();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void revalidate(), 60_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [revalidate]);

  useEffect(() => {
    let cancelled = false;
    detectOrigin()
      .then((origin) => {
        if (!cancelled && origin) setCoords(origin.coords);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("alerts-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        () => void revalidate(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [revalidate]);

  async function useMyLocation() {
    const outcome = await requestPreciseLocation();
    if (outcome.ok) setCoords(outcome.coords);
  }

  const withDist = useMemo(() => withDistance(alerts, coords), [alerts, coords]);

  const searched = useMemo(() => {
    if (!query) return withDist;
    return withDist.filter(
      (a) =>
        a.location.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query) ||
        (a.user?.full_name ?? "").toLowerCase().includes(query),
    );
  }, [withDist, query]);

  const filtered = useMemo(() => {
    const withDist = searched;
    if (tab === "following") {
      const set = new Set(followingIds);
      return withDist.filter((a) => set.has(a.user_id));
    }
    if (tab === "route") {
      const towns = routeTowns.map((t) => t.toLowerCase());
      if (towns.length === 0) return [];
      return withDist.filter((a) =>
        towns.some((t) => a.location.toLowerCase().includes(t)),
      );
    }
    if (tab === "nearby") {
      if (!coords) return withDist;
      return withDist.filter(
        (a) => a.distance_km !== null && a.distance_km !== undefined && a.distance_km <= 60,
      );
    }
    return withDist;
  }, [searched, tab, followingIds, routeTowns, coords]);

  const shown = useMemo(() => sortAlerts(filtered, sort), [filtered, sort]);

  function patch(next: Alert) {
    setAlerts((prev) => prev.map((a) => (a.id === next.id ? { ...a, ...next } : a)));
  }

  function drop(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setPending((prev) => prev.filter((a) => a.id !== id));
  }

  function requireAuth() {
    router.push("/auth/sign-in?next=/alerts");
  }

  const emptyCopy: Record<Tab, { title: string; body: string }> = {
    nearby: {
      title: "Roads are quiet near you",
      body: "Nothing reported within 60 km. Be the first to share what you can see.",
    },
    route: {
      title: "Nothing on your routes",
      body: "Search for a trip on the home page and we’ll watch those roads for you.",
    },
    following: {
      title: "You’re not following anyone yet",
      body: "Follow reporters whose alerts you trust and their updates land here.",
    },
    all: {
      title: "Roads are quiet",
      body: "Be the first to share what you can see out there.",
    },
  };

  return (
    <Wrap>
      <div ref={topRef} />

      <TabBar role="tablist" aria-label="Alert feeds">
        {TABS.map((t) => (
          <TabButton
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            $active={tab === t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === "nearby" && !coords) void useMyLocation();
            }}
          >
            {t.label}
          </TabButton>
        ))}
      </TabBar>

      {profile && (
        <AlertComposerInline
          profile={profile}
          onPosted={(posted) => {
            const optimistic: Alert = {
              id: posted.id,
              user_id: profile.id,
              location: posted.location,
              category: posted.category,
              content: posted.content,
              image_url: posted.image_url,
              lat: posted.lat,
              lng: posted.lng,
              reactions_count: 0,
              comments_count: 0,
              confirms_count: 0,
              cleared_count: 0,
              views_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              user: {
                id: profile.id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                trusted_reporter: false,
              },
              user_reaction: null,
              my_confirmation: null,
              saved_by_me: false,
              distance_km: null,
            };
            setAlerts((prev) => [optimistic, ...prev]);
          }}
        />
      )}

      <Toolbar>
        <div>
          <h1>Road alerts</h1>
          <p className="count">
            {shown.length} {shown.length === 1 ? "report" : "reports"}
          </p>
        </div>
        <Sorts role="group" aria-label="Sort alerts">
          {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => {
            const Icon = SORT_ICON[key];
            return (
              <SortButton
                key={key}
                type="button"
                $active={sort === key}
                disabled={key === "closest" && !coords}
                title={
                  key === "closest" && !coords
                    ? "Turn on location to sort by distance"
                    : undefined
                }
                onClick={() => setSort(key)}
              >
                <Icon size={16} />
                {SORT_LABEL[key]}
              </SortButton>
            );
          })}
        </Sorts>
      </Toolbar>

      {pending.length > 0 && (
        <ShowNew
          type="button"
          onClick={() => {
            setAlerts((prev) => {
              const seen = new Set(prev.map((a) => a.id));
              return [...pending.filter((a) => !seen.has(a.id)), ...prev];
            });
            setPending([]);
            topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          Show {pending.length} {pending.length === 1 ? "alert" : "alerts"}
        </ShowNew>
      )}

      {status === "error" ? (
        <Empty>
          <RotateCw size={26} />
          <span>
            <b>We couldn&rsquo;t load alerts</b>
            <p>Check your connection and try again.</p>
            <ButtonEl type="button" $compact $variant="ghost" onClick={() => void load(0)}>
              Try again
            </ButtonEl>
          </span>
        </Empty>
      ) : shown.length === 0 ? (
        <Empty>
          <Megaphone size={26} />
          <span>
            <b>{emptyCopy[tab].title}</b>
            <p>{emptyCopy[tab].body}</p>
          </span>
        </Empty>
      ) : (
        <Feed>
          {shown.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              viewerId={viewerId}
              onChange={patch}
              onDeleted={drop}
              onRequireAuth={requireAuth}
            />
          ))}
        </Feed>
      )}

      {!exhausted && tab === "all" && shown.length > 0 && (
        <More>
          <ButtonEl
            type="button"
            $compact
            $variant="ghost"
            disabled={status === "loading"}
            onClick={() => void load(alerts.length)}
          >
            {status === "loading" ? "Loading…" : "Load more"}
          </ButtonEl>
        </More>
      )}
    </Wrap>
  );
}
