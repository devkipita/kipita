"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import styled from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import { BellSlash as BellOff, Car, Checks as CheckCheck, Info, ArrowClockwise as RotateCw } from "@/components/icons";
import { TabIndicator } from "@/components/ui/TabIndicator";
import { markAllRead, markRead, refreshNotifications } from "@/lib/notifications/store";
import {
  tabForNotification,
  type AppNotification,
  type NotificationTab,
} from "@/lib/notifications/types";
import { useNotifications } from "@/lib/notifications/useNotifications";
import type { Profile } from "@/lib/auth/types";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { NotificationItem } from "./NotificationItem";
import { NotificationRowsSkeleton, INBOX_MAX } from "./NotificationsSkeleton";
import { PushBanner } from "./PushBanner";

const Wrap = styled(ContentWidth)`
  padding-block: 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;

  h1 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
`;

const HeadAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.textSoft};
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.surface2};
      color: ${({ theme }) => theme.color.text};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  &:disabled {
    color: ${nocturne.muted2};
    cursor: default;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  min-height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard};
  background: ${({ theme, $active }) => ($active ? "transparent" : theme.color.surface)};
  color: ${({ theme, $active }) => ($active ? nocturne.onGreen : theme.color.textSoft)};

  > span {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  @media (hover: hover) {
    &:hover {
      background: ${({ theme, $active }) => ($active ? "transparent" : theme.color.surface2)};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }

  em {
    font-style: normal;
    font-size: 0.75rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    padding: 2px 7px;
    border-radius: 999px;
    background: ${({ theme, $active }) => ($active ? nocturne.onGreen : theme.color.primaryContainer)};
    color: ${({ theme, $active }) => ($active ? nocturne.green : theme.color.onPrimaryContainer)};
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Center = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 56px 20px;
  color: ${({ theme }) => theme.color.muted};

  b {
    font-size: 1.05rem;
    font-weight: 800;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 0;
    max-width: 34ch;
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

const Retry = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 22px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition: transform ${dur.press} ${ease.standard};

  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const TABS: { key: NotificationTab; label: string }[] = [
  { key: "rides", label: "Rides" },
  { key: "updates", label: "Updates" },
  { key: "system", label: "System" },
];

const EMPTY_COPY: Record<NotificationTab, { title: string; body: string }> = {
  rides: {
    title: "No rides yet",
    body: "New trips and requests land here.",
  },
  updates: {
    title: "Nothing to catch up on",
    body: "Bookings, payments and messages show up here.",
  },
  system: {
    title: "No announcements",
    body: "Notices from Kipita appear here.",
  },
};

function capCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}

export function NotificationsView({ profile }: { profile: Profile }) {
  const { status, items, unread } = useNotifications(profile.id);
  const [tab, setTab] = useState<NotificationTab>("rides");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const grouped = useMemo(() => {
    const buckets: Record<NotificationTab, AppNotification[]> = {
      rides: [],
      updates: [],
      system: [],
    };
    for (const n of items) buckets[tabForNotification(n)].push(n);
    return buckets;
  }, [items]);

  const unreadPerTab = useMemo(() => {
    const counts: Record<NotificationTab, number> = { rides: 0, updates: 0, system: 0 };
    for (const key of TABS.map((t) => t.key)) {
      counts[key] = grouped[key].filter((n) => !n.read).length;
    }
    return counts;
  }, [grouped]);

  const visible = grouped[tab];

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const at = TABS.findIndex((t) => t.key === tab);
    const last = TABS.length - 1;
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? last : e.key === "ArrowRight" ? (at + 1) % TABS.length : (at - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  }

  return (
    <Wrap $max={INBOX_MAX}>
      <Head>
        <h1>Notifications</h1>
        <HeadAction
          type="button"
          onClick={() => void markAllRead()}
          disabled={unread === 0}
        >
          <CheckCheck size={18} />
          Mark all read
        </HeadAction>
      </Head>

      <PushBanner />

      <Tabs role="tablist" aria-label="Notification types" onKeyDown={onTabKey}>
        {TABS.map(({ key, label }, i) => {
          const active = tab === key;
          const count = unreadPerTab[key];
          return (
            <Tab
              key={key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`inbox-tab-${key}`}
              aria-selected={active}
              aria-controls="inbox-panel"
              tabIndex={active ? 0 : -1}
              $active={active}
              onClick={() => setTab(key)}
            >
              {active && <TabIndicator group="inbox" />}
              <span>
                {label}
                {count > 0 && (
                  <em aria-label={`${count} unread`}>{capCount(count)}</em>
                )}
              </span>
            </Tab>
          );
        })}
      </Tabs>

      <div role="tabpanel" id="inbox-panel" aria-labelledby={`inbox-tab-${tab}`}>
        {status === "loading" && <NotificationRowsSkeleton />}

        {status === "error" && (
          <Center role="alert">
            <Info size={30} />
            <b>We couldn&apos;t load these</b>
            <p>Check your connection and try again.</p>
            <Retry type="button" onClick={refreshNotifications}>
              <RotateCw size={18} /> Reload notifications
            </Retry>
          </Center>
        )}

        {status === "ready" &&
          (visible.length === 0 ? (
            <Center>
              {tab === "rides" ? <Car size={30} /> : <BellOff size={30} />}
              <b>{EMPTY_COPY[tab].title}</b>
              <p>{EMPTY_COPY[tab].body}</p>
            </Center>
          ) : (
            <List>
              {visible.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onOpen={(n) => void markRead(n.id)}
                />
              ))}
            </List>
          ))}
      </div>
    </Wrap>
  );
}
