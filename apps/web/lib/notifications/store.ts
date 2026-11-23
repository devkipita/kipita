"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { activityOf } from "./activity";
import {
  PAGE_SIZE,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";
import { ping } from "./ping";
import type { AppNotification } from "./types";

export type NotificationsStatus = "idle" | "loading" | "ready" | "error";

export interface NotificationsState {
  status: NotificationsStatus;
  items: AppNotification[];
  unread: number;
  incoming: AppNotification | null;
  hasMore: boolean;
  loadingMore: boolean;
}

const EMPTY: NotificationsState = {
  status: "idle",
  items: [],
  unread: 0,
  incoming: null,
  hasMore: false,
  loadingMore: false,
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

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): NotificationsState {
  return state;
}

export function getServerSnapshot(): NotificationsState {
  return EMPTY;
}

export function connectNotifications(userId: string): void {
  if (!userId) {
    if (activeUserId !== null) resetNotifications();
    return;
  }
  if (activeUserId === userId) return;

  resetNotifications();
  activeUserId = userId;
  set({ ...EMPTY, status: "loading" });

  void load(userId);
  void openChannel(userId);
}

export function resetNotifications(): void {
  if (channel) {
    void supabase().removeChannel(channel);
    channel = null;
  }
  activeUserId = null;
  state = EMPTY;
  emit();
}

function mergeFirstPage(fresh: AppNotification[]): AppNotification[] {
  if (state.items.length <= fresh.length || fresh.length < PAGE_SIZE) return fresh;
  const oldest = fresh[fresh.length - 1].created_at;
  const ids = new Set(fresh.map((n) => n.id));
  const older = state.items.filter((n) => !ids.has(n.id) && n.created_at < oldest);
  return [...fresh, ...older];
}

async function load(userId: string): Promise<void> {
  try {
    const [items, unread] = await Promise.all([
      fetchNotifications(supabase(), userId),
      fetchUnreadCount(supabase(), userId),
    ]);
    if (activeUserId !== userId) return;
    const merged = mergeFirstPage(items);
    set({
      status: "ready",
      items: merged,
      unread,
      hasMore: merged.length > items.length ? state.hasMore : items.length === PAGE_SIZE,
    });
  } catch {
    if (activeUserId !== userId) return;
    if (state.status !== "ready") set({ status: "error" });
  }
}

export async function loadOlder(): Promise<boolean> {
  const userId = activeUserId;
  const oldest = state.items[state.items.length - 1];
  if (!userId || !oldest || state.loadingMore || !state.hasMore) return true;
  set({ loadingMore: true });
  try {
    const older = await fetchNotifications(supabase(), userId, PAGE_SIZE, oldest.created_at);
    if (activeUserId !== userId) return true;
    const seen = new Set(state.items.map((n) => n.id));
    set({
      items: [...state.items, ...older.filter((n) => !seen.has(n.id))],
      hasMore: older.length === PAGE_SIZE,
      loadingMore: false,
    });
    return true;
  } catch {
    set({ loadingMore: false });
    return false;
  }
}

export function refreshNotifications(): void {
  if (!activeUserId) return;
  if (state.status === "error") set({ status: "loading" });
  void load(activeUserId);
}

async function openChannel(userId: string): Promise<void> {
  const client = supabase();

  try {
    const {
      data: { session },
    } = await client.auth.getSession();
    if (session?.access_token) client.realtime.setAuth(session.access_token);
  } catch {
    if (activeUserId !== userId) return;
  }
  if (activeUserId !== userId) return;

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
      if (subscribed) refreshNotifications();
      subscribed = true;
    });
}

function receive(row: AppNotification): void {
  if (state.items.some((n) => n.id === row.id)) return;

  set({
    items: [row, ...state.items],
    unread: row.read ? state.unread : state.unread + 1,
    incoming: row,
  });
  announce(row);
}

function reconcile(row: AppNotification): void {
  const previous = state.items.find((n) => n.id === row.id);
  if (!previous) return;

  const delta = Number(previous.read) - Number(row.read);
  set({
    items: state.items.map((n) => (n.id === row.id ? row : n)),
    unread: Math.max(0, state.unread + delta),
  });
}

function announce(row: AppNotification): void {
  if (row.read) return;
  ping({ title: row.title, body: row.body, tag: row.id, href: activityOf(row).href });
}

function setRead(ids: Set<string>, read: boolean): number {
  let changed = 0;
  const items = state.items.map((n) => {
    if (!ids.has(n.id) || n.read === read) return n;
    changed += 1;
    return { ...n, read };
  });
  if (changed) set({ items, unread: Math.max(0, state.unread + (read ? -changed : changed)) });
  return changed;
}

export async function markRead(id: string): Promise<void> {
  const ids = new Set([id]);
  if (!setRead(ids, true)) return;

  try {
    await markNotificationRead(supabase(), id);
  } catch {
    setRead(ids, false);
  }
}

export async function markAllRead(): Promise<void> {
  const userId = activeUserId;
  if (!userId || state.unread === 0) return;

  const ids = new Set(state.items.filter((n) => !n.read).map((n) => n.id));
  const previousUnread = state.unread;
  setRead(ids, true);
  const hidden = Math.max(0, previousUnread - ids.size);
  if (hidden) set({ unread: Math.max(0, state.unread - hidden) });

  try {
    await markAllNotificationsRead(supabase(), userId);
  } catch {
    setRead(ids, false);
    if (hidden) set({ unread: state.unread + hidden });
  }
}

export function dismissIncoming(): void {
  if (state.incoming) set({ incoming: null });
}
