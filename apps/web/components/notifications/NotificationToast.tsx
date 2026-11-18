"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { AnimatePresence, m, type PanInfo } from "motion/react";
import { ArrowRight, X } from "@/components/icons";
import { TONE } from "@/components/notifications/ActivityRow";
import { activityOf, type ActivityTone } from "@/lib/notifications/activity";
import {
  dismissIncoming,
  getServerSnapshot,
  getSnapshot,
  markRead,
  subscribe,
} from "@/lib/notifications/store";
import type { AppNotification } from "@/lib/notifications/types";
import { spring, tween } from "@/lib/motion";
import { dur, ease, nocturne } from "@/lib/nocturne";

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
  grid-template-columns: 44px minmax(0, 1fr) 36px;
  align-items: start;
  gap: 4px 12px;
  padding: 14px 12px 18px 14px;
  border-radius: 22px;
  border: 1px solid ${nocturne.line2};
  background: ${nocturne.surface};
  box-shadow: ${nocturne.panelShadow};
  pointer-events: auto;
  touch-action: pan-x;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const Well = styled.span<{ $tone: ActivityTone }>`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  ${({ $tone }) => TONE[$tone]}
`;

const Body = styled.div`
  min-width: 0;
  padding-top: 1px;

  .label {
    display: block;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  b {
    display: block;
    margin-top: 2px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.3;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  p {
    margin: 3px 0 0;
    font-size: 14px;
    line-height: 1.45;
    color: ${nocturne.muted};
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const Go = styled.button`
  grid-column: 2;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  margin-top: 8px;
  padding: 0 14px;
  border: 0;
  border-radius: 12px;
  background: ${nocturne.surface2};
  color: ${nocturne.greenDeep};
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  &[data-urgent="true"] {
    background: ${nocturne.ctaBg};
    color: ${nocturne.ctaFg};
  }

  svg {
    transition: transform ${dur.state} ${ease.enter};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${nocturne.lime};
      color: ${nocturne.greenDeep};
    }
    &:hover svg {
      transform: translateX(3px);
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Close = styled.button`
  grid-column: 3;
  grid-row: 1;
  position: relative;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.surface3};
  color: ${nocturne.muted};
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard};

  &::after {
    content: "";
    position: absolute;
    inset: -4px;
  }

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.cream};
      background: ${nocturne.surface2};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Track = styled.span`
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 8px;
  height: 3px;
  border-radius: 999px;
  overflow: hidden;
  background: ${nocturne.surface3};
`;

const Timer = styled.i<{ $held: boolean }>`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  transform-origin: 0 50%;
  background: ${nocturne.accent};
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

  const a = activityOf(notification);
  const Icon = a.icon;
  const href = a.href;

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
      <Well $tone={a.tone} aria-hidden>
        <Icon size={22} weight="bold" />
      </Well>
      <Body>
        <span className="label">{a.label}</span>
        <b>{notification.title}</b>
        {notification.body ? <p>{notification.body}</p> : null}
      </Body>
      <Close type="button" onClick={onDismiss} aria-label="Dismiss notification">
        <X size={16} weight="bold" />
      </Close>
      {href && a.action ? (
        <Go type="button" onClick={open} data-urgent={a.tone === "urgent" ? "true" : "false"}>
          {a.action}
          <ArrowRight size={16} weight="bold" />
        </Go>
      ) : null}
      <Track aria-hidden>
        <Timer key={notification.id} $held={held} />
      </Track>
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
