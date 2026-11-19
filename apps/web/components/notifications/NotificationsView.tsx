"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import styled from "styled-components";
import { Checks } from "@/components/icons";
import { ContentWidth, useAppMode } from "@/components/nav/AppShell";
import { Chip } from "@/components/ui/Chip";
import { TabIndicator } from "@/components/ui/TabIndicator";
import type { Profile } from "@/lib/auth/types";
import { nocturne } from "@/lib/nocturne";
import { activityOf, groupByDay, needsYou, type ActivityGroup } from "@/lib/notifications/activity";
import { loadOlder, markAllRead, refreshNotifications } from "@/lib/notifications/store";
import { useNotifications } from "@/lib/notifications/useNotifications";
import { ActivityRow } from "./ActivityRow";
import { ActivityEmpty, ActivityError, ActivitySkeletonRows } from "./ActivityStates";
import { PushBanner } from "./PushBanner";

export const INBOX_MAX = 760;

type Filter = "all" | ActivityGroup;

const FILTERS: { key: Filter; label: string; empty: string }[] = [
  { key: "all", label: "All", empty: "" },
  { key: "trips", label: "Trips", empty: "trip updates" },
  { key: "payments", label: "Payments", empty: "payments" },
  { key: "alerts", label: "Alerts", empty: "road alerts" },
];

export const Page = styled(ContentWidth)`
  padding-block: clamp(20px, 4vw, 40px) 56px;
`;

export const Head = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 20px;
  margin-bottom: 18px;

  h1 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(30px, 5vw, 44px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: ${nocturne.cream};
  }
  p {
    margin: 6px 0 0;
    font-size: 15px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
`;

const MarkAll = styled(Chip)``;

export const Tabs = styled.div`
  position: sticky;
  top: var(--sticky-top, 0px);
  z-index: 3;
  display: flex;
  gap: 8px;
  margin: 0 calc(-1 * var(--page-pad)) 8px;
  padding: 8px var(--page-pad);
  overflow-x: auto;
  scrollbar-width: none;
  background: ${nocturne.bg};

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled(Chip)<{ $on: boolean }>`
  flex: none;
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font-weight: ${({ $on }) => ($on ? 800 : 700)};

  .t {
    position: relative;
    z-index: 1;
  }
  .n {
    display: inline-grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: ${({ $on }) => ($on ? nocturne.lime : nocturne.ctaBg)};
    color: ${({ $on }) => ($on ? nocturne.greenDeep : nocturne.ctaFg)};
    font-size: 12px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
`;

const Day = styled.section`
  display: grid;
  gap: 6px;
  margin-top: 18px;

  h2 {
    margin: 0 0 2px 14px;
    font-size: 13px;
    font-weight: 800;
    color: ${nocturne.muted2};
  }
`;

const Urgent = styled.section`
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 12px;
  border-radius: 24px;
  background: color-mix(in oklab, ${nocturne.lime} 26%, ${nocturne.bg});

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 2px 6px 4px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.015em;
    color: ${nocturne.greenDeep};
  }
  .n {
    display: inline-grid;
    place-items: center;
    min-width: 22px;
    height: 22px;
    padding: 0 7px;
    border-radius: 999px;
    background: ${nocturne.ctaBg};
    color: ${nocturne.ctaFg};
    font-size: 12.5px;
    font-weight: 800;
  }
`;

const More = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  margin-top: 18px;
  border: 0;
  border-radius: 14px;
  background: ${nocturne.surface2};
  color: ${nocturne.greenDeep};
  font: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    cursor: progress;
    color: ${nocturne.muted2};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const MoreError = styled.p`
  margin: 10px 0 0;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: ${nocturne.danger};
`;

function cap(n: number): string {
  return n > 99 ? "99+" : String(n);
}

export function NotificationsView({ profile }: { profile: Profile }) {
  const { status, items, unread, hasMore, loadingMore } = useNotifications(profile.id);
  const { mode } = useAppMode();
  const [filter, setFilter] = useState<Filter>("all");
  const [moreFailed, setMoreFailed] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { visible, unreadBy } = useMemo(() => {
    const counts: Record<Filter, number> = { all: 0, trips: 0, payments: 0, alerts: 0 };
    const list = [];
    for (const n of items) {
      const group = activityOf(n).group;
      if (!n.read) {
        counts.all += 1;
        counts[group] += 1;
      }
      if (filter === "all" || filter === group) list.push(n);
    }
    return { visible: list, unreadBy: counts };
  }, [items, filter]);

  const { urgent, days } = useMemo(() => {
    const now = Date.now();
    const top = visible.filter((n) => needsYou(n, now));
    const ids = new Set(top.map((n) => n.id));
    return { urgent: top, days: groupByDay(visible.filter((n) => !ids.has(n.id)), now) };
  }, [visible]);

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const at = FILTERS.findIndex((f) => f.key === filter);
    const last = FILTERS.length - 1;
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? last : e.key === "ArrowRight" ? (at + 1) % FILTERS.length : (at - 1 + FILTERS.length) % FILTERS.length;
    setFilter(FILTERS[next].key);
    tabRefs.current[next]?.focus();
  }

  const loading = status === "idle" || status === "loading";
  const current = FILTERS.find((f) => f.key === filter)!;

  return (
    <Page $max={INBOX_MAX}>
      <Head>
        <div>
          <h1>Activity</h1>
          <p aria-live="polite">
            {loading ? "Loading your activity" : unread ? `${cap(unread)} unread` : "You're all caught up"}
          </p>
        </div>
        <MarkAll type="button" disabled={unread === 0} onClick={() => void markAllRead()}>
          <Checks size={18} weight="bold" />
          Mark all read
        </MarkAll>
      </Head>

      <PushBanner />

      <Tabs role="tablist" aria-label="Filter activity" onKeyDown={onTabKey}>
        {FILTERS.map((f, i) => {
          const on = f.key === filter;
          const n = unreadBy[f.key];
          return (
            <Tab
              key={f.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`activity-tab-${f.key}`}
              aria-selected={on}
              aria-controls="activity-panel"
              tabIndex={on ? 0 : -1}
              $on={on}
              onClick={() => setFilter(f.key)}
            >
              {on ? <TabIndicator group="activity" tone="chip" /> : null}
              <span className="t">{f.label}</span>
              {n > 0 ? <span className="t n" aria-label={`${n} unread`}>{cap(n)}</span> : null}
            </Tab>
          );
        })}
      </Tabs>

      <div id="activity-panel" role="tabpanel" aria-labelledby={`activity-tab-${filter}`}>
        {loading ? (
          <ActivitySkeletonRows rows={7} />
        ) : status === "error" ? (
          <ActivityError onRetry={refreshNotifications} />
        ) : days.length === 0 && urgent.length === 0 ? (
          <ActivityEmpty driver={mode === "driver"} filtered={current.empty || null} />
        ) : (
          <>
            {urgent.length > 0 ? (
              <Urgent aria-label="Needs you">
                <h2>
                  Needs you <span className="n">{urgent.length}</span>
                </h2>
                {urgent.map((n, i) => (
                  <ActivityRow key={n.id} item={n} index={i} />
                ))}
              </Urgent>
            ) : null}
            {(() => {
              let i = urgent.length;
              return days.map((day) => (
                <Day key={day.key} aria-label={day.label}>
                  <h2>{day.label}</h2>
                  {day.items.map((n) => (
                    <ActivityRow key={n.id} item={n} index={i++} />
                  ))}
                </Day>
              ));
            })()}
            {hasMore ? (
              <More
                type="button"
                disabled={loadingMore}
                aria-busy={loadingMore}
                onClick={async () => setMoreFailed(!(await loadOlder()))}
              >
                {loadingMore ? "Loading earlier activity…" : "Show earlier activity"}
              </More>
            ) : null}
            {moreFailed ? <MoreError role="alert">That didn&apos;t load. Try again.</MoreError> : null}
          </>
        )}
      </div>
    </Page>
  );
}
