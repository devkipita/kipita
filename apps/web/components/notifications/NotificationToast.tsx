"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { X } from "@/components/icons";
import { NOTIFICATION_META } from "@/lib/notifications/meta";
import { notificationRoute } from "@/lib/notifications/route";
import {
  dismissIncoming,
  getServerSnapshot,
  getSnapshot,
  markRead,
  subscribe,
} from "@/lib/notifications/store";
import { nocturne } from "@/lib/nocturne";

const LIFETIME = 8000;

const slide = keyframes`
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to   { opacity: 1; transform: none; }
`;

const drain = keyframes`
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
`;

const Dock = styled.div`
  position: fixed;
  z-index: 70;
  right: 20px;
  bottom: calc(20px + var(--bottom-bar-space, 0px));
  width: min(380px, calc(100vw - 40px));
  pointer-events: none;

  @media (max-width: 560px) {
    right: 12px;
    left: 12px;
    width: auto;
  }
`;

const Card = styled.div`
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 30px;
  align-items: start;
  gap: 14px;
  padding: 16px 16px 18px;
  border-radius: 20px;
  border: 1.5px solid ${nocturne.cardBorder};
  background: ${nocturne.surface};
  box-shadow: ${nocturne.panelShadow};
  pointer-events: auto;
  animation: ${slide} 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Mark = styled.span`
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: ${nocturne.surface2};
  color: ${nocturne.accent};
`;

const Body = styled.button`
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;

  b {
    display: block;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }
  p {
    margin: 4px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${nocturne.muted};
  }
  span {
    display: inline-block;
    margin-top: 8px;
    font-size: 13px;
    font-weight: 800;
    color: ${nocturne.accent};
    box-shadow: inset 0 -2px 0 currentColor;
  }

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 4px;
    border-radius: 8px;
  }
`;

const Close = styled.button`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${nocturne.muted};
  cursor: pointer;

  &:hover {
    color: ${nocturne.cream};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Timer = styled.i`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  transform-origin: 0 50%;
  background: ${nocturne.ctaBg};
  animation: ${drain} ${LIFETIME}ms linear forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export function NotificationToast() {
  const router = useRouter();
  const { incoming } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!incoming || held) return;
    const timer = setTimeout(dismissIncoming, LIFETIME);
    return () => clearTimeout(timer);
  }, [incoming, held]);

  if (!incoming) return null;

  const meta = NOTIFICATION_META[incoming.type] ?? NOTIFICATION_META.system;
  const Icon = meta.icon;
  const href = notificationRoute(incoming.data);

  function open() {
    if (!incoming) return;
    void markRead(incoming.id);
    dismissIncoming();
    if (href) router.push(href);
  }

  return (
    <Dock
      role="status"
      aria-live="polite"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      <Card>
        <Mark>
          <Icon size={20} weight="fill" />
        </Mark>
        <Body type="button" onClick={open}>
          <b>{incoming.title}</b>
          <p>{incoming.body}</p>
          {href && <span>Open it</span>}
        </Body>
        <Close type="button" onClick={dismissIncoming} aria-label="Dismiss">
          <X size={16} />
        </Close>
        {!held && <Timer aria-hidden />}
      </Card>
    </Dock>
  );
}
