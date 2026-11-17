"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import {
  CaretDown,
  Clock,
  Crosshair,
  Megaphone,
  SealCheck,
} from "@/components/icons";
import { ButtonEl } from "@/components/ui/primitives";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { BreakArt } from "@/components/ui/StatusArt";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { TabIndicator } from "@/components/ui/TabIndicator";
import { createClient } from "@/lib/supabase/client";
import { fetchAlerts } from "@/lib/alerts/api";
import {
  ALERT_TABS,
  SORT_LABEL,
  sortAlerts,
  type AlertTab,
  type SortKey,
} from "@/lib/alerts/status";
import { requestPreciseLocation, withDistance } from "@/lib/alerts/location";
import { detectOrigin } from "@/lib/home/geo";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { Alert } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import { AlertCard } from "./AlertCard";
import { AlertComposerInline } from "./AlertComposerInline";

type Tab = AlertTab;

const Wrap = styled.div`
  padding-bottom: 40px;
`;

const TabBar = styled.div`
  position: sticky;
  top: var(--sticky-top, 0px);
  z-index: 5;
  display: flex;
  background: color-mix(in srgb, ${nocturne.bg} 95%, transparent);
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
  position: relative;
  flex: 1 0 auto;
  min-height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active }) => ($active ? nocturne.cream : nocturne.muted)};
  cursor: pointer;
  white-space: nowrap;
  transition: color ${dur.state} ${ease.standard};

  .text {
    position: relative;
    z-index: 1;
  }
  @media (hover: hover) {
    &:hover {
      color: ${nocturne.cream};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -3px;
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
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const SortTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 14px 0 12px;
  border: 1px solid ${nocturne.outline};
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  svg {
    flex: none;
  }
  .caret {
    opacity: 0.72;
    transition: transform ${dur.state} ${ease.standard};
  }
  &[aria-expanded="true"] .caret {
    transform: rotate(180deg);
  }
  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }
  &[aria-expanded="true"] {
    background: ${nocturne.surface2};
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const SortItem = styled(PopoverItem)`
  .hint {
    margin-left: auto;
    font-size: 13px;
    font-weight: 500;
    color: ${nocturne.muted2};
  }
  &:disabled {
    cursor: default;
    color: ${nocturne.muted2};
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
  font-weight: 600;
  cursor: pointer;

  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.color.surfaceContainerLow};
    }
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

const Block = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 28px 16px 40px;
  text-align: center;
  color: ${nocturne.cream};

  .art {
    width: min(220px, 70%);
    margin-bottom: 4px;
  }
  .glyph {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    margin-bottom: 4px;
    border-radius: 999px;
    background: ${nocturne.surface2};
    color: ${nocturne.accent};
  }
  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-wrap: balance;
  }
  p {
    margin: 0;
    max-width: 40ch;
    font-size: 15px;
    line-height: 1.5;
    color: ${nocturne.muted};
  }
  button {
    margin-top: 8px;
  }
`;

const More = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 20px 0;

  p {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${nocturne.danger};
  }
`;

const PAGE = 20;

const SORT_ICON: Record<SortKey, typeof Clock> = {
  newest: Clock,
  confirmed: SealCheck,
  closest: Crosshair,
};

type FeedStatus = "ready" | "error" | "retrying";
type Locating = "idle" | "asking" | "denied" | "unavailable";

export function AlertsView({
  initialAlerts,
  initialFailed = false,
  profile,
  followingIds,
  routeTowns,
}: {
  initialAlerts: Alert[];
  initialFailed?: boolean;
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
  const [sortOpen, setSortOpen] = useState(false);
  const [status, setStatus] = useState<FeedStatus>(initialFailed ? "error" : "ready");
  const [paging, setPaging] = useState(false);
  const [inlineFail, setInlineFail] = useState<{ offset: number } | null>(null);
  const [exhausted, setExhausted] = useState(initialAlerts.length < PAGE);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<Locating>("idle");
  const [pending, setPending] = useState<Alert[]>([]);
  const topRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const alertsRef = useRef<Alert[]>(initialAlerts);
  alertsRef.current = alerts;

  const load = useCallback(
    async (offset = 0) => {
      const replacing = offset === 0;
      const blank = alertsRef.current.length === 0;
      setInlineFail(null);
      if (replacing && blank) setStatus((s) => (s === "error" ? "retrying" : s));
      if (!replacing) setPaging(true);
      try {
        const next = await fetchAlerts(createClient(), {
          offset,
          limit: PAGE,
          viewerId,
        });
        setAlerts((prev) => (replacing ? next : [...prev, ...next]));
        setExhausted(next.length < PAGE);
        setStatus("ready");
      } catch {
        if (replacing && blank) setStatus("error");
        else setInlineFail({ offset });
      } finally {
        if (!replacing) setPaging(false);
      }
    },
    [viewerId],
  );

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
      return;
    }
  }, [viewerId]);

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

  async function locateMe() {
    setLocating("asking");
    const outcome = await requestPreciseLocation();
    if (outcome.ok) {
      setCoords(outcome.coords);
      setLocating("idle");
      return;
    }
    setLocating(outcome.reason);
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

  const locationOff = tab === "nearby" && !coords;

  const filtered = useMemo(() => {
    if (tab === "following") {
      const set = new Set(followingIds);
      return searched.filter((a) => set.has(a.user_id));
    }
    if (tab === "route") {
      const towns = routeTowns.map((t) => t.toLowerCase());
      if (towns.length === 0) return [];
      return searched.filter((a) => towns.some((t) => a.location.toLowerCase().includes(t)));
    }
    if (tab === "nearby") {
      if (!coords) return [];
      return searched.filter(
        (a) => a.distance_km !== null && a.distance_km !== undefined && a.distance_km <= 60,
      );
    }
    return searched;
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

  function selectTab(next: Tab, focus = false) {
    setTab(next);
    if (focus) tabRefs.current[next]?.focus();
  }

  function onTabKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const at = ALERT_TABS.findIndex((t) => t.key === tab);
    const last = ALERT_TABS.length - 1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowRight"
            ? (at + 1) % ALERT_TABS.length
            : (at - 1 + ALERT_TABS.length) % ALERT_TABS.length;
    selectTab(ALERT_TABS[next].key, true);
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

  const SortIcon = SORT_ICON[sort];
  const failed = status !== "ready";

  let body;
  if (failed) {
    body = (
      <Block role="alert">
        <div className="art">
          <BreakArt />
        </div>
        <h2>Alerts didn&rsquo;t load</h2>
        <p>Check your connection and try again.</p>
        <ButtonEl
          type="button"
          disabled={status === "retrying"}
          aria-busy={status === "retrying"}
          onClick={() => void load(0)}
        >
          {status === "retrying" ? (
            <>
              Loading <ButtonOrb job="fetching" />
            </>
          ) : (
            "Reload alerts"
          )}
        </ButtonEl>
      </Block>
    );
  } else if (locationOff) {
    body = (
      <Block>
        <span className="glyph" aria-hidden>
          <Crosshair size={28} />
        </span>
        <h2>Turn on location to see nearby alerts</h2>
        {locating === "denied" && (
          <p role="alert">Location is blocked for this site. Allow it in your browser settings.</p>
        )}
        {locating === "unavailable" && (
          <p role="alert">Couldn&rsquo;t find you. Try again outdoors or with Wi-Fi on.</p>
        )}
        <ButtonEl
          type="button"
          disabled={locating === "asking"}
          aria-busy={locating === "asking"}
          onClick={() => void locateMe()}
        >
          {locating === "asking" ? (
            <>
              Finding you <ButtonOrb job="fetching" />
            </>
          ) : (
            <>
              <Crosshair size={18} aria-hidden /> Turn on location
            </>
          )}
        </ButtonEl>
      </Block>
    );
  } else if (shown.length === 0) {
    body = (
      <Empty>
        <Megaphone size={26} />
        <span>
          <b>{emptyCopy[tab].title}</b>
          <p>{emptyCopy[tab].body}</p>
        </span>
      </Empty>
    );
  } else {
    body = (
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
    );
  }

  const canPage = !failed && !exhausted && tab === "all" && shown.length > 0;

  return (
    <Wrap>
      <div ref={topRef} />

      <TabBar role="tablist" aria-label="Alert feeds" onKeyDown={onTabKey}>
        {ALERT_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TabButton
              key={t.key}
              ref={(el) => {
                tabRefs.current[t.key] = el;
              }}
              id={`alerts-tab-${t.key}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls="alerts-panel"
              tabIndex={active ? 0 : -1}
              $active={active}
              onClick={() => selectTab(t.key)}
            >
              {active && <TabIndicator group="alerts" tone="underline" />}
              <span className="text">{t.label}</span>
            </TabButton>
          );
        })}
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

      <div id="alerts-panel" role="tabpanel" aria-labelledby={`alerts-tab-${tab}`}>
        <Toolbar>
          <div>
            <h1>Road alerts</h1>
            {!failed && !locationOff && (
              <p className="count">
                {shown.length} {shown.length === 1 ? "report" : "reports"}
              </p>
            )}
          </div>
          <SortTrigger
            ref={sortRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={sortOpen}
            aria-label={`Sort alerts: ${SORT_LABEL[sort]}`}
            onClick={() => setSortOpen((v) => !v)}
          >
            <SortIcon size={18} aria-hidden />
            {SORT_LABEL[sort]}
            <CaretDown size={16} className="caret" aria-hidden />
          </SortTrigger>
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
            Show {pending.length} new {pending.length === 1 ? "alert" : "alerts"}
          </ShowNew>
        )}

        {body}

        {inlineFail ? (
          <More role="alert">
            <p>
              {inlineFail.offset > 0
                ? "Couldn’t load more alerts."
                : "Couldn’t refresh alerts."}
            </p>
            <ButtonEl
              type="button"
              $compact
              $variant="light"
              onClick={() => void load(inlineFail.offset)}
            >
              {inlineFail.offset > 0 ? "Try loading more" : "Refresh alerts"}
            </ButtonEl>
          </More>
        ) : canPage ? (
          <More>
            <ButtonEl
              type="button"
              $compact
              $variant="light"
              disabled={paging}
              aria-busy={paging}
              onClick={() => void load(alerts.length)}
            >
              {paging ? (
                <>
                  Loading <ButtonOrb job="fetching" on="surface" />
                </>
              ) : (
                "Load more alerts"
              )}
            </ButtonEl>
          </More>
        ) : null}
      </div>

      <Popover
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        anchorRef={sortRef}
        label="Sort alerts"
        align="end"
      >
        {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => {
          const Icon = SORT_ICON[key];
          const needsLocation = key === "closest" && !coords;
          return (
            <SortItem
              key={key}
              type="button"
              role="menuitemradio"
              aria-checked={sort === key}
              disabled={needsLocation}
              onClick={() => {
                setSort(key);
                setSortOpen(false);
                sortRef.current?.focus({ preventScroll: true });
              }}
            >
              <Icon size={18} aria-hidden />
              {SORT_LABEL[key]}
              {needsLocation && <span className="hint">Needs location</span>}
            </SortItem>
          );
        })}
      </Popover>
    </Wrap>
  );
}
