"use client";

import { useEffect, useRef, useState } from "react";
import { ping } from "@/lib/notifications/ping";

export const RELEASE = process.env.NEXT_PUBLIC_RELEASE ?? "0.0.0";

const CHECK_EVERY_MS = 10 * 60_000;
const MIN_GAP_MS = 60_000;
const DISMISSED_KEY = "kipita-update-dismissed";

function featureLine(version: string): string {
  const [major = "0", minor = "0"] = version.split(".");
  return `${major}.${minor}`;
}

export function isMajorUpdate(running: string, live: string): boolean {
  return featureLine(running) !== featureLine(live);
}

function dismissedRelease(): string | null {
  try {
    return sessionStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

export function dismissUpdate(release: string): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, release);
  } catch {
    return;
  }
}

async function liveRelease(): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { release?: unknown };
    return typeof body.release === "string" ? body.release : null;
  } catch {
    return null;
  }
}

export function useAppUpdate(): { release: string | null; dismiss: () => void } {
  const [release, setRelease] = useState<string | null>(null);
  const announced = useRef<string | null>(null);

  useEffect(() => {
    let lastCheck = 0;
    let alive = true;

    const check = async () => {
      if (document.visibilityState === "hidden" && lastCheck > 0) return;
      const now = Date.now();
      if (now - lastCheck < MIN_GAP_MS) return;
      lastCheck = now;
      const live = await liveRelease();
      if (!alive || !live || !isMajorUpdate(RELEASE, live) || dismissedRelease() === live) return;
      if (announced.current === live) return;
      announced.current = live;
      setRelease(live);
      ping({
        title: "Kipita has a new version",
        body: "Reload Kipita to start using it.",
        tag: `kipita-update-${live}`,
        quiet: true,
      });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, []);

  return {
    release,
    dismiss: () => {
      if (release) dismissUpdate(release);
      setRelease(null);
    },
  };
}
