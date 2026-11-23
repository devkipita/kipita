"use client";

import { useSyncExternalStore } from "react";

export type PageTitle = { title: string; back: string };

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

export function usePageTitle(): PageTitle | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
