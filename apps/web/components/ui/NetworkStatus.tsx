"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { CheckCircle, CloudOffline } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { TOPBAR_H, TOPBAR_H_SM } from "@/lib/nav/rail";
import { refreshNotifications } from "@/lib/notifications/store";

type State = "online" | "offline" | "back";

const Pill = styled.div<{ $tone: State }>`
  position: fixed;
  top: calc(${TOPBAR_H}px + 10px);

  @media (max-width: 960px) {
    top: calc(${TOPBAR_H_SM}px + max(10px, env(safe-area-inset-top)));
  }
  left: 50%;
  z-index: 160;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: calc(100vw - 24px);
  padding: 10px 16px 10px 12px;
  border-radius: 999px;
  background: ${({ $tone }) => ($tone === "back" ? nocturne.green : nocturne.greenDeep)};
  color: ${nocturne.onGreen};
  box-shadow: ${nocturne.panelShadow};
  transform: translate(-50%, calc(-100% - 24px));
  opacity: 0;
  pointer-events: none;
  transition:
    transform 220ms cubic-bezier(0.3, 0, 0.8, 0.15),
    opacity 200ms ease,
    background 200ms ease;

  &[data-show="true"] {
    transform: translate(-50%, 0);
    opacity: 1;
    transition:
      transform 380ms cubic-bezier(0.32, 0.72, 0, 1),
      opacity 200ms ease,
      background 200ms ease;
  }

  .icon {
    display: grid;
    flex: none;
    color: ${({ $tone }) => ($tone === "back" ? nocturne.onGreen : nocturne.lime)};
  }
  b {
    font-size: 14px;
    font-weight: 800;
    white-space: nowrap;
  }
  span.sub {
    font-size: 13px;
    font-weight: 600;
    color: ${nocturne.onGreenMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export function NetworkStatus() {
  const router = useRouter();
  const [state, setState] = useState<State>("online");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const goOffline = () => {
      if (timer.current) window.clearTimeout(timer.current);
      setState("offline");
    };
    const goOnline = () => {
      setState((prev) => (prev === "offline" ? "back" : prev));
      router.refresh();
      refreshNotifications();
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("online"), 2200);
    };
    if (!navigator.onLine) goOffline();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [router]);

  return (
    <Pill $tone={state} data-show={state !== "online" ? "true" : "false"} role="status" aria-live="polite">
      {state === "back" ? (
        <>
          <span className="icon">
            <CheckCircle size={20} weight="fill" />
          </span>
          <b>Back online</b>
        </>
      ) : (
        <>
          <span className="icon">
            <CloudOffline size={20} weight="bold" />
          </span>
          <b>You&apos;re offline</b>
          <span className="sub">Reconnecting…</span>
        </>
      )}
    </Pill>
  );
}
