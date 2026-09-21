"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import {
  NOTIFICATION_META,
  notifToneColors,
  shortRelativeTime,
  type NotifTone,
} from "@/lib/notifications/meta";
import { notificationRoute } from "@/lib/notifications/route";
import type { AppNotification } from "@/lib/notifications/types";

const rowBase = css<{ $unread: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  text-align: left;
  text-decoration: none;
  background: ${({ theme, $unread }) =>
    $unread ? theme.color.surface : "transparent"};
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
  }
`;

const RowLink = styled(Link)<{ $unread: boolean }>`
  ${rowBase}
  &:hover {
    transform: translateY(-1px);
  }
`;

const RowButton = styled.button<{ $unread: boolean }>`
  ${rowBase}
  cursor: pointer;
  font: inherit;
`;

const Lead = styled.span<{ $tone: NotifTone; $unread: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex: none;
  opacity: ${({ $unread }) => ($unread ? 1 : 0.55)};
  background: ${({ theme, $tone }) => notifToneColors(theme, $tone).bg};
  color: ${({ theme, $tone }) => notifToneColors(theme, $tone).on};
`;

const Body = styled.span`
  flex: 1;
  min-width: 0;
  display: block;
`;

const TitleRow = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Title = styled.span<{ $unread: boolean }>`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95rem;
  font-weight: ${({ $unread }) => ($unread ? 800 : 700)};
  color: ${({ theme, $unread }) =>
    $unread ? theme.color.text : theme.color.textSoft};
`;

const Stamp = styled.span`
  flex: none;
  font-size: 0.74rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.muted};
`;

const Dot = styled.span<{ $tone: NotifTone }>`
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme, $tone }) => notifToneColors(theme, $tone).on};
`;

const Text = styled.span<{ $unread: boolean }>`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 3px;
  font-size: 0.86rem;
  line-height: 1.4;
  color: ${({ theme, $unread }) =>
    $unread ? theme.color.textSoft : theme.color.muted};
`;

/**
 * One row in the inbox. Rows whose payload has a web destination navigate;
 * the rest (system messages, and targets that still only exist in the app)
 * are buttons that just clear the unread state — matching mobile, where
 * `notificationRoute` returning null means "mark read and stay put".
 */
export function NotificationItem({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}) {
  const meta = NOTIFICATION_META[notification.type] ?? NOTIFICATION_META.system;
  const Icon = meta.icon;
  const unread = !notification.read;
  const href = notificationRoute(notification.data);

  const inner = (
    <>
      <Lead $tone={meta.tone} $unread={unread}>
        <Icon size={19} strokeWidth={2.2} />
      </Lead>
      <Body>
        <TitleRow>
          <Title $unread={unread}>{notification.title}</Title>
          <Stamp>{shortRelativeTime(notification.created_at)}</Stamp>
          {unread && <Dot $tone={meta.tone} />}
        </TitleRow>
        <Text $unread={unread}>{notification.body}</Text>
      </Body>
    </>
  );

  const label = `${unread ? "Unread. " : ""}${notification.title}. ${notification.body}`;

  if (href) {
    return (
      <RowLink
        href={href}
        $unread={unread}
        aria-label={label}
        onClick={() => onOpen(notification)}
      >
        {inner}
      </RowLink>
    );
  }

  return (
    <RowButton
      type="button"
      $unread={unread}
      aria-label={label}
      onClick={() => onOpen(notification)}
    >
      {inner}
    </RowButton>
  );
}
