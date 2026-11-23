"use client";

import { useSyncExternalStore } from "react";

export type PageTitle = { title: string; back?: string; backLabel?: string };

const HOME = { back: "/home", backLabel: "Back to home" };
const PROFILE = { back: "/profile", backLabel: "Back to profile" };

const ROUTES: { match: RegExp; page: PageTitle }[] = [
  { match: /^\/trips\/[^/]+$/, page: { title: "Trip", back: "/trips", backLabel: "Back to trips" } },
  { match: /^\/trips$/, page: { title: "Trips", ...HOME } },
  { match: /^\/alerts(?:\/[^/]+)?$/, page: { title: "Road alerts" } },
  { match: /^\/publish$/, page: { title: "Publish a ride" } },
  { match: /^\/notifications$/, page: { title: "Activity", ...HOME } },
  { match: /^\/profile$/, page: { title: "Profile", ...HOME } },
  { match: /^\/profile\/edit$/, page: { title: "Edit profile", ...PROFILE } },
  { match: /^\/referrals$/, page: { title: "Invite friends", ...PROFILE } },
  { match: /^\/wallet$/, page: { title: "Wallet", ...PROFILE } },
  { match: /^\/ride\/[^/]+$/, page: { title: "Ride", ...HOME } },
  { match: /^\/send$/, page: { title: "Send", ...HOME } },
];

export function routeTitle(pathname: string): PageTitle | null {
  return ROUTES.find((r) => r.match.test(pathname))?.page ?? null;
}

let current: PageTitle | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function setPageTitle(next: PageTitle | null) {
  current = next;
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePageTitle(pathname: string): PageTitle | null {
  const override = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  return override ?? routeTitle(pathname);
}
