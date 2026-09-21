"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";
import { notificationRoute } from "./route";
import type { AppNotification } from "./types";

/**
 * One live notification feed shared by every consumer on the page.
 *
 * The bell sits in the header and the inbox is a separate route, so a React
 * context would mean threading a provider through layouts that don't exist yet.
 * Instead this module owns a single store: one fetch, one realtime channel,
 * read through `useSyncExternalStore`. Mounting a second consumer is free.
 *
 * `notifications` is already in the `supabase_realtime` publication (migration
 * 001), so INSERTs from the broadcast triggers (008) reach an open tab the
 * moment a driver posts a trip or a passenger posts a request — the web
 * counterpart of the Expo push that migration 007 sends to devices.
 */

export type NotificationsStatus = "idle" | "loading" | "ready" | "error";

export interface NotificationsState {
  status: NotificationsStatus;
  items: AppNotification[];
  /** Unread across *all* rows, not just the fetched page. */
  unread: number;
  /** Newest realtime arrival, surfaced as a toast until dismissed. */
  incoming: AppNotification | null;
}

const EMPTY: NotificationsState = {
  status: "idle",
  items: [],
  unread: 0,
  incoming: null,
};

let state: NotificationsState = EMPTY;
const listeners = new Set<() => void>();

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let activeUserId: string | null = null;

function supabase(): SupabaseClient {
  client ??= createClient();
  return client;
}

function emit() {
  for (const listener of listeners) listener();
}

function set(patch: Partial<NotificationsState>) {
  state = { ...state, ...patch };
  emit();
}

/* ── Store contract for useSyncExternalStore ── */

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): NotificationsState {
  return state;
}

/** SSR has no session-scoped feed — render the empty shell, hydrate after. */
export function getServerSnapshot(): NotificationsState {
  return EMPTY;
}

/* ── Lifecycle ── */

/**
 * Attach the feed to `userId`. Idempotent: calling it again for the same user
 * is a no-op, so re-mounting the bell on every client navigation costs nothing.
 * Switching users tears the old channel down first.
 */
export function connectNotifications(userId: string): void {
  if (activeUserId === userId) return;

  resetNotifications();
  activeUserId = userId;
  set({ ...EMPTY, status: "loading" });

  void load(userId);
  void openChannel(userId);
}

/** Drop the channel and clear the feed — call on sign-out. */
export function resetNotifications(): void {
  if (channel) {
    void supabase().removeChannel(channel);
    channel = null;
  }
  activeUserId = null;
  state = EMPTY;
  emit();
}

async function load(userId: string): Promise<void> {
  try {
    const [items, unread] = await Promise.all([
      fetchNotifications(supabase(), userId),
      fetchUnreadCount(supabase(), userId),
    ]);
    // A user switch may have landed while we were awaiting — discard stale data.
    if (activeUserId !== userId) return;
    set({ status: "ready", items, unread });
  } catch {
    if (activeUserId !== userId) return;
    set({ status: "error" });
  }
}

/** Re-fetch the current feed (used after reconnecting, and by pull-to-refresh). */
export function refreshNotifications(): void {
  if (activeUserId) void load(activeUserId);
}

async function openChannel(userId: string): Promise<void> {
  const client = supabase();

  // `notifications` is RLS'd to the owner, and Realtime evaluates those policies
  // against the socket's token. The browser client hydrates its session from
  // cookies asynchronously, so hand Realtime the access token before
  // subscribing — otherwise the socket authenticates as anon and no row ever
  // arrives.
  try {
    const {
      data: { session },
    } = await client.auth.getSession();
    if (session?.access_token) client.realtime.setAuth(session.access_token);
  } catch {
    // Fall through — a failed handshake degrades to fetch-on-load.
  }
  if (activeUserId !== userId) return; // user switched while awaiting

  const filter = `user_id=eq.${userId}`;
  let subscribed = false;

  channel = client
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter },
      ({ new: row }) => receive(row as AppNotification),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notifications", filter },
      ({ new: row }) => reconcile(row as AppNotification),
    )
    .subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      // A dropped socket can miss rows; re-sync once it comes back. The first
      // SUBSCRIBED races the initial load, so skip that one.
      if (subscribed) refreshNotifications();
      subscribed = true;
    });
}

/* ── Realtime handlers ── */

function receive(row: AppNotification): void {
  if (state.items.some((n) => n.id === row.id)) return;

  set({
    items: [row, ...state.items],
    unread: row.read ? state.unread : state.unread + 1,
    incoming: row,
  });
  announce(row);
}

/** Keep read-state in sync when another tab (or the phone) marks a row read. */
function reconcile(row: AppNotification): void {
  const previous = state.items.find((n) => n.id === row.id);
  if (!previous) return;

  const delta = Number(previous.read) - Number(row.read);
  set({
    items: state.items.map((n) => (n.id === row.id ? row : n)),
    unread: Math.max(0, state.unread + delta),
  });
}

/**
 * Raise an OS-level notification for an arrival while the tab is open.
 *
 * This is deliberately not a Web Push subscription: background delivery needs a
 * service worker plus VAPID keys, and the delivery trigger in migration 007
 * only speaks the Expo push API. Until that exists, an open tab still gets the
 * same alert the phone does.
 */
function announce(row: AppNotification): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  try {
    const osNotification = new Notification(row.title, {
      body: row.body,
      tag: row.id,
      icon: "/favicons/favicon-32x32.png",
    });
    osNotification.onclick = () => {
      window.focus();
      const path = notificationRoute(row.data);
      if (path) window.location.assign(path);
    };
  } catch {
    // Some browsers only allow notifications via a service worker — the
    // in-app toast already covers the arrival.
  }
}

/* ── Mutations (optimistic, reverted on failure) ── */

export async function markRead(id: string): Promise<void> {
  const target = state.items.find((n) => n.id === id);
  if (!target || target.read) return;

  set({
    items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
    unread: Math.max(0, state.unread - 1),
  });

  try {
    await markNotificationRead(supabase(), id);
  } catch {
    set({
      items: state.items.map((n) => (n.id === id ? { ...n, read: false } : n)),
      unread: state.unread + 1,
    });
  }
}

export async function markAllRead(): Promise<void> {
  const userId = activeUserId;
  if (!userId || state.unread === 0) return;

  const previous = state.items;
  const previousUnread = state.unread;
  set({ items: previous.map((n) => ({ ...n, read: true })), unread: 0 });

  try {
    await markAllNotificationsRead(supabase(), userId);
  } catch {
    set({ items: previous, unread: previousUnread });
  }
}

/** Dismiss the toast without touching read state. */
export function dismissIncoming(): void {
  if (state.incoming) set({ incoming: null });
}
