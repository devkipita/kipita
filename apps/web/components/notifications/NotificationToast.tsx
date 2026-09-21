"use client";

import { useEffect } from "react";
import Link from "next/link";
import styled, { keyframes } from "styled-components";
import { X } from "lucide-react";
import {
  NOTIFICATION_META,
  notifToneColors,
  type NotifTone,
} from "@/lib/notifications/meta";
import { notificationRoute } from "@/lib/notifications/route";
import { dismissIncoming, markRead } from "@/lib/notifications/store";
import type { AppNotification } from "@/lib/notifications/types";

const DISMISS_AFTER_MS = 8000;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Dock = styled.div`
  position: fixed;
  right: clamp(12px, 3vw, 24px);
  bottom: clamp(12px, 3vw, 24px);
  z-index: 60;
  width: min(360px, calc(100vw - 24px));
`;

const Card = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 14px 14px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.card};
  animation: ${slideIn} 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Lead = styled.span<{ $tone: NotifTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex: none;
  background: ${({ theme, $tone }) => notifToneColors(theme, $tone).bg};
  color: ${({ theme, $tone }) => notifToneColors(theme, $tone).on};
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;

  b {
    display: block;
    font-size: 0.93rem;
    font-weight: 800;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 3px 0 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const Open = styled(Link)`
  display: inline-block;
  margin-top: 9px;
  font-size: 0.83rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Close = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.color.muted};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.text};
  }
`;

/**
 * In-app toast for a notification that arrived over realtime while the tab was
 * open. Complements the OS notification (which only fires once permission is
 * granted) so an arrival is never silent.
 */
export function NotificationToast({
  notification,
}: {
  notification: AppNotification | null;
}) {
  const id = notification?.id;

  useEffect(() => {
    if (!id) return;
    const timer = window.setTimeout(dismissIncoming, DISMISS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [id]);

  if (!notification) return null;

  const meta = NOTIFICATION_META[notification.type] ?? NOTIFICATION_META.system;
  const Icon = meta.icon;
  const href = notificationRoute(notification.data);

  return (
    <Dock role="status" aria-live="polite">
      <Card>
        <Lead $tone={meta.tone}>
          <Icon size={19} strokeWidth={2.2} />
        </Lead>
        <Body>
          <b>{notification.title}</b>
          <p>{notification.body}</p>
          {href && (
            <Open
              href={href}
              onClick={() => {
                void markRead(notification.id);
                dismissIncoming();
              }}
            >
              View ride
            </Open>
          )}
        </Body>
        <Close type="button" onClick={dismissIncoming} aria-label="Dismiss">
          <X size={16} strokeWidth={2.4} />
        </Close>
      </Card>
    </Dock>
  );
}
