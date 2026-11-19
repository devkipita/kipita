"use client";

import { useCallback, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const TIMEOUT_MS = 1200;

let settle: (() => void) | null = null;

function canTransition(): boolean {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function ViewTransitionBridge() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    settle?.();
    settle = null;
  }, [pathname]);
  return null;
}

export function useMorphNavigate() {
  const router = useRouter();
  return useCallback(
    (href: string, source?: HTMLElement | null, name = "morph-hero") => {
      if (!canTransition()) {
        router.push(href);
        return;
      }
      if (source) source.style.viewTransitionName = name;
      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            settle = resolve;
            router.push(href);
            window.setTimeout(resolve, TIMEOUT_MS);
          }),
      );
      transition.finished.finally(() => {
        if (source) source.style.viewTransitionName = "";
      });
    },
    [router],
  );
}
