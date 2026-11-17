"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { AnimatePresence, m, type PanInfo } from "motion/react";
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
import type { AppNotification } from "@/lib/notifications/types";
import { spring, tween } from "@/lib/motion";
import { nocturne } from "@/lib/nocturne";

const LIFETIME = 8000;
const SWIPE_DISTANCE = 56;
const SWIPE_VELOCITY = 500;

const drain = keyframes`
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
`;

export const ToastDock = styled.div`
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

const Card = styled(m.div)`
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 44px;
  align-items: start;
  gap: 12px;
  padding: 14px 10px 18px 16px;
  border-radius: 20px;
  border: 1.5px solid ${nocturne.cardBorder};
  background: ${nocturne.surface};
  box-shadow: ${nocturne.panelShadow};
  pointer-events: auto;
  touch-action: pan-x;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const Mark = styled.span`
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-top: 2px;
  border-radius: 999px;
  background: ${nocturne.surface2};
  color: ${nocturne.accent};
`;

const Body = styled.button`
  min-width: 0;
  padding: 2px 0 0;
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
    overflow-wrap: anywhere;
  }
  p {
    margin: 4px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${nocturne.muted};
    overflow-wrap: anywhere;
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
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${nocturne.muted};
  cursor: pointer;

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.cream};
      background: ${nocturne.surface2};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -3px;
  }
`;

const Timer = styled.i<{ $held: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  transform-origin: 0 50%;
  background: ${nocturne.ctaBg};
  animation: ${drain} ${LIFETIME}ms linear forwards;
  animation-play-state: ${({ $held }) => ($held ? "paused" : "running")};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

function useCountdown(held: boolean, dismiss: () => void) {
  const remaining = useRef(LIFETIME);
  const startedAt = useRef(0);

  useEffect(() => {
    if (held) return;
    startedAt.current = Date.now();
    const timer = setTimeout(dismiss, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [held, dismiss]);
}

export function IncomingToast({
  notification,
  onDismiss = dismissIncoming,
}: {
  notification: AppNotification;
  onDismiss?: () => void;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const held = hovered || focused || dragging;

  useCountdown(held, onDismiss);

  const meta = NOTIFICATION_META[notification.type] ?? NOTIFICATION_META.system;
  const Icon = meta.icon;
  const href = notificationRoute(notification.data);

  function open() {
    void markRead(notification.id);
    onDismiss();
    if (href) router.push(href);
  }

  function release(_: unknown, info: PanInfo) {
    setDragging(false);
    if (info.offset.y > SWIPE_DISTANCE || info.velocity.y > SWIPE_VELOCITY) onDismiss();
  }

  return (
    <Card
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.08, bottom: 1 }}
      dragSnapToOrigin
      dragTransition={{ bounceStiffness: 600, bounceDamping: 40 }}
      onDragStart={() => setDragging(true)}
      onDragEnd={release}
      initial={{ y: "110%", opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: spring.sheet }}
      exit={{ y: "110%", opacity: 0, transition: tween.exit }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <Mark>
        <Icon size={20} weight="fill" />
      </Mark>
      <Body type="button" onClick={open}>
        <b>{notification.title}</b>
        <p>{notification.body}</p>
        {href && <span>Open it</span>}
      </Body>
      <Close type="button" onClick={onDismiss} aria-label="Dismiss notification">
        <X size={18} />
      </Close>
      <Timer key={notification.id} $held={held} aria-hidden />
    </Card>
  );
}

export function NotificationToast() {
  const { incoming } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <ToastDock role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        {incoming && <IncomingToast key={incoming.id} notification={incoming} />}
      </AnimatePresence>
    </ToastDock>
  );
}
