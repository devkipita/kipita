"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import styled from "styled-components";
import { Checks, Warning } from "@/components/icons";
import { ContentWidth, useAppMode } from "@/components/nav/AppShell";
import { Chip } from "@/components/ui/Chip";
import { RollingNumber } from "@/components/ui/Counter";
import { TabIndicator } from "@/components/ui/TabIndicator";
import type { Profile } from "@/lib/auth/types";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { activityOf, bookingOf, groupByDay, needsYou, settledBookings, type ActivityGroup } from "@/lib/notifications/activity";
import { loadOlder, markAllRead, refreshNotifications } from "@/lib/notifications/store";
import { useClock } from "@/lib/notifications/useClock";
import { useNotifications } from "@/lib/notifications/useNotifications";
import { ActivityRow, RowList } from "./ActivityRow";
import { ActivityEmpty, ActivityError, ActivitySkeletonRows } from "./ActivityStates";
import { PushBanner } from "./PushBanner";
import { useOpenSeatRequests } from "./useOpenSeatRequests";

export const INBOX_MAX = 680;

type Filter = "all" | ActivityGroup;

export const FILTERS: { key: Filter; label: string; empty: string }[] = [
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
  margin-bottom: 16px;

  h1 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(30px, 5vw, 44px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: ${nocturne.cream};
  }
`;

export const Sub = styled.p`
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 20px;
  margin: 8px 0 0;
  font-size: 15px;
  line-height: 20px;
  font-weight: 600;
  color: ${nocturne.muted};
`;

const MarkAll = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceContainerHighest};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.cream} 8%, transparent);
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (pointer: coarse) {
    min-height: 44px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

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

export const Tab = styled(Chip)<{ $on: boolean }>`
  flex: none;
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};

  .t {
    position: relative;
    z-index: 1;
  }
`;

const Count = styled.span`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  border-radius: 6px;
  justify-content: center;
  background: ${({ theme }) => theme.color.error};
  color: ${({ theme }) => theme.color.onError};
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`;

const Section = styled.section`
  display: grid;
  margin-top: 16px;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 8px 12px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: ${nocturne.cream};
  }
`;

const Mark = styled.span`
  display: inline-grid;
  place-items: center;
  color: ${({ theme }) => theme.color.warning};
`;

const More = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  margin-top: 20px;
  border: 0;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceContainerHighest};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.cream} 8%, transparent);
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  &:disabled {
    cursor: progress;
    color: ${nocturne.muted};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const MoreError = styled.p`
  margin: 12px 0 0;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.error};
`;

export function NotificationsView({ profile }: { profile: Profile }) {
  const { status, items, unread, hasMore, loadingMore } = useNotifications(profile.id);
  const { mode } = useAppMode();
  const now = useClock();
  const [filter, setFilter] = useState<Filter>("all");
  const [moreFailed, setMoreFailed] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const seatsOpen = useOpenSeatRequests(items);
  const settled = useMemo(() => settledBookings(items), [items]);

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
    const clock = now || Date.now();
    const top = visible.filter((n) => needsYou(n, clock, settled));
    const ids = new Set(top.map((n) => n.id));
    return { urgent: top, days: groupByDay(visible.filter((n) => !ids.has(n.id)), clock) };
  }, [visible, now, settled]);

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const at = FILTERS.findIndex((f) => f.key === filter);
    const last = FILTERS.length - 1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowRight"
            ? (at + 1) % FILTERS.length
            : (at - 1 + FILTERS.length) % FILTERS.length;
    setFilter(FILTERS[next].key);
    tabRefs.current[next]?.focus();
  }

  const loading = status === "idle" || status === "loading";
  const current = FILTERS.find((f) => f.key === filter)!;
  const seatOpen = (n: (typeof items)[number]) => {
    const booking = bookingOf(n);
    return booking ? seatsOpen.has(booking) : false;
  };
  const isSettled = (n: (typeof items)[number]) => {
    const booking = bookingOf(n);
    return booking ? settled.has(booking) : false;
  };

  let index = 0;

  return (
    <Page $max={INBOX_MAX}>
      <Head>
        <div>
          <h1>Activity</h1>
          <Sub aria-live="polite">
            {loading ? (
              "Loading your activity"
            ) : unread ? (
              <>
                <RollingNumber value={unread} ariaLabel={`${unread} unread`} />
                <span aria-hidden="true">unread</span>
              </>
            ) : (
              "You're all caught up"
            )}
          </Sub>
        </div>
        {unread > 0 ? (
          <MarkAll type="button" onClick={() => void markAllRead()}>
            <Checks size={20} weight="bold" />
            Mark all read
          </MarkAll>
        ) : null}
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
              {n > 0 ? (
                <Count>
                  <RollingNumber value={n} ariaLabel={`${n} unread`} />
                </Count>
              ) : null}
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
              <Section aria-labelledby="activity-needs-you">
                <h2 id="activity-needs-you">
                  <Mark aria-hidden="true">
                    <Warning size={20} weight="fill" />
                  </Mark>
                  Needs you
                  <Count>
                    <RollingNumber value={urgent.length} ariaLabel={`${urgent.length} waiting`} />
                  </Count>
                </h2>
                <RowList>
                  {urgent.map((n) => (
                    <ActivityRow key={n.id} item={n} now={now} index={index++} lines={3} seatOpen={seatOpen(n)} settled={isSettled(n)} />
                  ))}
                </RowList>
              </Section>
            ) : null}
            {days.map((day) => (
              <Section key={day.key} aria-labelledby={`activity-day-${day.key}`}>
                <h2 id={`activity-day-${day.key}`}>{day.label}</h2>
                <RowList>
                  {day.items.map((n) => (
                    <ActivityRow key={n.id} item={n} now={now} index={index++} lines={3} seatOpen={seatOpen(n)} settled={isSettled(n)} />
                  ))}
                </RowList>
              </Section>
            ))}
            {hasMore ? (
              <More
                type="button"
                disabled={loadingMore}
                aria-busy={loadingMore}
                onClick={async () => setMoreFailed(!(await loadOlder()))}
              >
                {loadingMore ? "Loading earlier activity" : "Show earlier activity"}
              </More>
            ) : null}
            {moreFailed ? <MoreError role="alert">Earlier activity didn&apos;t load. Try again.</MoreError> : null}
          </>
        )}
      </div>
    </Page>
  );
}
