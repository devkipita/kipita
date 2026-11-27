"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Putting Kipita on the home screen.
 *
 * Chrome and Edge (Android and desktop) send `beforeinstallprompt` once the page qualifies; the event
 * is kept here, because it can arrive long before anyone opens the account menu, and it can be used
 * once. Safari on iPhone and iPad has no such event: the only way is Share, then Add to Home Screen,
 * so for those we show a short sheet that says so. Everywhere else (and inside an installed app, or
 * a social app's built-in browser) there is nothing to offer, so the menu row stays hidden.
 */

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallKind = "prompt" | "ios" | null;

let saved: PromptEvent | null = null;
let helpOpen = false;
let wired = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  wire();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Starts listening. Safe to call more than once; does nothing on the server. */
export function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    saved = event as PromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    saved = null;
    helpOpen = false;
    emit();
  });
}

function isInstalled(): boolean {
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isApple(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  // iPadOS 13+ reports itself as a Mac.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function inSocialBrowser(): boolean {
  return /FBAN|FBAV|Instagram|TikTok|Line\//.test(navigator.userAgent);
}

function kind(): InstallKind {
  if (isInstalled()) return null;
  if (saved) return "prompt";
  if (isApple() && !inSocialBrowser()) return "ios";
  return null;
}

/** What the menu can offer on this device, and the action for it. */
export function useInstall() {
  const offer = useSyncExternalStore(subscribe, kind, () => null);

  const install = useCallback(async () => {
    if (saved) {
      const event = saved;
      saved = null;
      emit();
      await event.prompt();
      await event.userChoice.catch(() => undefined);
      return;
    }
    helpOpen = true;
    emit();
  }, []);

  return { offer, install };
}

/** The iPhone steps sheet. */
export function useInstallHelp() {
  const open = useSyncExternalStore(subscribe, () => helpOpen, () => false);
  const close = useCallback(() => {
    helpOpen = false;
    emit();
  }, []);
  return { open, close };
}
