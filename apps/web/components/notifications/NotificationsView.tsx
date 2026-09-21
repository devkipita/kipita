"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import { BellOff, Car, CheckCheck, Info, Loader2, RotateCw } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { markAllRead, markRead, refreshNotifications } from "@/lib/notifications/store";
import {
  tabForNotification,
  type AppNotification,
  type NotificationTab,
} from "@/lib/notifications/types";
import { useNotifications } from "@/lib/notifications/useNotifications";
import type { Profile } from "@/lib/auth/types";
import { NotificationItem } from "./NotificationItem";
import { PushBanner } from "./PushBanner";

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.bg};
`;

const Wrap = styled.main`
  max-width: 640px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 28px) 72px;
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
  height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.textSoft};
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.text};
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
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
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  background: ${({ theme, $active }) =>
    $active ? theme.color.primary : theme.color.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onPrimary : theme.color.textSoft};

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.color.primaryDark : theme.color.surface2};
  }

  em {
    font-style: normal;
    font-size: 0.74rem;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 999px;
    background: ${({ theme, $active }) =>
      $active ? theme.color.onPrimary : theme.color.primaryContainer};
    color: ${({ theme, $active }) =>
      $active ? theme.color.primary : theme.color.onPrimaryContainer};
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
  svg.spin {
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Retry = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 20px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font-weight: 800;
  cursor: pointer;
`;

const TABS: { key: NotificationTab; label: string }[] = [
  { key: "rides", label: "Rides" },
  { key: "updates", label: "Updates" },
  { key: "system", label: "System" },
];

const EMPTY_COPY: Record<NotificationTab, { title: string; body: string }> = {
  rides: {
    title: "No rides yet",
    body: "When a driver posts a trip or a passenger requests one, it lands here straight away.",
  },
  updates: {
    title: "Nothing to catch up on",
    body: "Bookings, payments and messages will show up here.",
  },
  system: {
    title: "No announcements",
    body: "Notices from the Kipita team appear here.",
  },
};

/**
 * The notification inbox — the web counterpart of the mobile Alerts tab.
 *
 * Rows arrive live over realtime (see `lib/notifications/store.ts`), so a trip
 * posted by a driver shows up without a refresh, the same way the push lands on
 * a phone.
 */
export function NotificationsView({ profile }: { profile: Profile }) {
  const { status, items, unread } = useNotifications(profile.id);
  const [tab, setTab] = useState<NotificationTab>("rides");

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

  return (
    <Page>
      <AppHeader
        name={profile.full_name}
        avatarUrl={profile.avatar_url}
        userId={profile.id}
      />
      <Wrap>
        <Head>
          <h1>Notifications</h1>
          <HeadAction
            type="button"
            onClick={() => void markAllRead()}
            disabled={unread === 0}
          >
            <CheckCheck size={16} strokeWidth={2.4} />
            Mark all read
          </HeadAction>
        </Head>

        <PushBanner />

        <Tabs role="tablist">
          {TABS.map(({ key, label }) => (
            <Tab
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              $active={tab === key}
              onClick={() => setTab(key)}
            >
              {label}
              {unreadPerTab[key] > 0 && <em>{unreadPerTab[key]}</em>}
            </Tab>
          ))}
        </Tabs>

        {status === "loading" && (
          <Center>
            <Loader2 className="spin" size={26} strokeWidth={2.2} />
            <p>Loading your notifications…</p>
          </Center>
        )}

        {status === "error" && (
          <Center>
            <Info size={30} strokeWidth={2} />
            <b>We couldn&apos;t load these</b>
            <p>Check your connection and try again.</p>
            <Retry type="button" onClick={refreshNotifications}>
              <RotateCw size={16} strokeWidth={2.4} /> Retry
            </Retry>
          </Center>
        )}

        {status === "ready" &&
          (visible.length === 0 ? (
            <Center>
              {tab === "rides" ? (
                <Car size={30} strokeWidth={2} />
              ) : (
                <BellOff size={30} strokeWidth={2} />
              )}
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
      </Wrap>
    </Page>
  );
}
