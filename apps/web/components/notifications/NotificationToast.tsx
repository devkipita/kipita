"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Link from "next/link";
import styled from "styled-components";
import { AnimatePresence, m, type PanInfo } from "motion/react";
import { Clock, X } from "@/components/icons";
import { overlayInteractive, SeatAnswer } from "@/components/notifications/ActivityRow";
import { roleColors } from "@/components/notifications/roles";
import { useSeatOutcome } from "@/components/notifications/useOpenSeatRequests";
import { activityOf, bookingOf, holdOpen, type ActivityRole } from "@/lib/notifications/activity";
import { shortRelativeTime } from "@/lib/notifications/meta";
import {
  dismissIncoming,
  getServerSnapshot,
  getSnapshot,
  markRead,
  subscribe,
} from "@/lib/notifications/store";
import { useClock } from "@/lib/notifications/useClock";
import type { AppNotification } from "@/lib/notifications/types";
import { spring, tween } from "@/lib/motion";
import { dur, ease, nocturne } from "@/lib/nocturne";

const LIFETIME = 8000;
const SWIPE_DISTANCE = 56;
const SWIPE_VELOCITY = 500;
const TINTED: ReadonlySet<ActivityRole> = new Set(["warning", "error", "success", "lime"]);

export const ToastDock = styled.div`
  position: fixed;
  z-index: 70;
  right: 20px;
  bottom: calc(20px + var(--bottom-bar-space, 0px));
  width: min(400px, calc(100vw - 40px));
  pointer-events: none;

  @media (max-width: 560px) {
    right: 12px;
    left: 12px;
    width: auto;
  }
`;

const Card = styled(m.div)<{ $role: ActivityRole }>`
  position: relative;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  align-items: start;
  gap: 12px;
  padding: 12px 8px 12px 12px;
  border-radius: 20px;
  background: ${({ $role }) =>
    TINTED.has($role) ? `color-mix(in oklab, var(--toast-tint) 22%, ${nocturne.popover})` : nocturne.popover};
  --toast-tint: ${({ theme, $role }) => roleColors(theme, $role).bg};
  box-shadow: ${nocturne.popoverShadow};
  pointer-events: auto;
  touch-action: pan-x;
  user-select: none;
`;

const OpenLink = styled(Link)`
  ${overlayInteractive}
  border-radius: 20px;
`;

const Tile = styled.span<{ $role: ActivityRole }>`
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  pointer-events: none;
  background: ${({ theme, $role }) => roleColors(theme, $role).bg};
  color: ${({ theme, $role }) => roleColors(theme, $role).ink};
  --icon-knockout: ${({ theme, $role }) => roleColors(theme, $role).bg};
`;

const Body = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 2px;
  min-width: 0;
  pointer-events: none;

  b {
    font-size: 15px;
    font-weight: 700;
    line-height: 20px;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  p {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    color: ${nocturne.muted};
    overflow-wrap: anywhere;
  }
`;

const Meta = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin-top: 2px;
  font-size: 13px;
  line-height: 16px;
  font-weight: 600;
  color: ${nocturne.muted2};
  font-variant-numeric: tabular-nums;

  .hold {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 700;
    color: ${({ theme }) => theme.color.warning};
  }
`;

const Close = styled.button`
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-top: -4px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${nocturne.cream};
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: color-mix(in oklab, ${nocturne.cream} 8%, transparent);
    }
  }
  &:active {
    transform: scale(0.97);
    background: color-mix(in oklab, ${nocturne.cream} 12%, transparent);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (pointer: coarse) {
    width: 44px;
    height: 44px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return hidden;
}

function useCountdown(held: boolean, dismiss: () => void) {
  const remaining = useRef(LIFETIME);
  const startedAt = useRef(0);

  useEffect(() => {
    if (held) return;
    startedAt.current = Date.now();
    let timer = 0;
    const fire = () => {
      if (document.querySelector("[data-overlay]")) {
        timer = window.setTimeout(fire, 1000);
        return;
      }
      dismiss();
    };
    timer = window.setTimeout(fire, remaining.current);
    return () => {
      window.clearTimeout(timer);
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
  const now = useClock();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragged = useRef(false);
  const hidden = usePageHidden();
  const a = activityOf(notification);
  const bookingId = bookingOf(notification);
  const outcome = useSeatOutcome(a.kind === "seat_request" ? bookingId : null);
  const asking = a.kind === "seat_request" && bookingId !== null;

  useCountdown(hovered || focused || dragging || hidden, onDismiss);

  const Icon = a.icon;
  const clock = now || Date.now();
  const live = a.expiresAt ? holdOpen(a, clock) : false;
  const left = a.expiresAt ? Math.ceil((new Date(a.expiresAt).getTime() - clock) / 60_000) : 0;
  const titleId = `toast-${notification.id}-title`;
  const textId = `toast-${notification.id}-text`;

  function release(_: unknown, info: PanInfo) {
    setDragging(false);
    if (info.offset.y > SWIPE_DISTANCE || info.velocity.y > SWIPE_VELOCITY) onDismiss();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    onDismiss();
  }

  return (
    <Card
      $role={a.role}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.08, bottom: 1 }}
      dragSnapToOrigin
      onDragStart={() => {
        dragged.current = true;
        setDragging(true);
      }}
      onDragEnd={release}
      initial={{ y: "110%", opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: spring.sheet }}
      exit={{ y: "110%", opacity: 0, transition: tween.exit }}
      onPointerDown={() => {
        dragged.current = false;
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={onKeyDown}
    >
      {a.href ? (
        <OpenLink
          href={a.href}
          aria-labelledby={notification.body ? `${titleId} ${textId}` : titleId}
          onClick={(e) => {
            if (dragged.current) {
              e.preventDefault();
              return;
            }
            void markRead(notification.id);
            onDismiss();
          }}
        />
      ) : null}
      <Tile $role={a.role} aria-hidden="true">
        <Icon size={20} />
      </Tile>
      <Body>
        <b id={titleId}>{notification.title}</b>
        {notification.body ? <p id={textId}>{notification.body}</p> : null}
        <Meta>
          <span>
            {a.label} · {shortRelativeTime(notification.created_at, clock)}
          </span>
          {a.expiresAt && live ? (
            <span className="hold">
              <Clock size={16} />
              {left} min left to pay
            </span>
          ) : null}
        </Meta>
        {asking && bookingId ? (
          <SeatAnswer item={notification} bookingId={bookingId} seats={a.seats ?? 1} outcome={outcome} />
        ) : null}
      </Body>
      <Close type="button" onClick={onDismiss} aria-label="Dismiss notification">
        <X size={20} weight="bold" />
      </Close>
    </Card>
  );
}

export function NotificationToast() {
  const { incoming } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <ToastDock role="status" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {incoming ? <IncomingToast key={incoming.id} notification={incoming} /> : null}
      </AnimatePresence>
    </ToastDock>
  );
}
