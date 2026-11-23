"use client";

import { useSyncExternalStore } from "react";

const TICK = 30_000;
const listeners = new Set<() => void>();
let now = 0;
let timer: number | null = null;

function tick() {
  now = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    now = Date.now();
    timer = window.setInterval(tick, TICK);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

export function useClock(): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => 0,
  );
}
