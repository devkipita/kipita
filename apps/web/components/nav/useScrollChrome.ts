"use client";

import { useEffect, type RefObject } from "react";

const PHONE = "(max-width: 899px)";
const THRESHOLD = 8;
const REVEAL_ZONE = 72;

export function useScrollChrome(target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const mq = window.matchMedia(PHONE);
    let last = window.scrollY;
    let frame = 0;
    let hidden = false;

    const set = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      el.dataset.chrome = next ? "hidden" : "shown";
    };

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;
      if (!mq.matches || y < REVEAL_ZONE) {
        set(false);
        last = y;
        return;
      }
      if (Math.abs(delta) < THRESHOLD) return;
      set(delta > 0);
      last = y;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    const onFocus = (event: FocusEvent) => {
      if ((event.target as HTMLElement | null)?.closest("[data-chrome-bar]")) set(false);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocus);
    mq.addEventListener("change", read);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocus);
      mq.removeEventListener("change", read);
      if (frame) cancelAnimationFrame(frame);
      delete el.dataset.chrome;
    };
  }, [target]);
}
