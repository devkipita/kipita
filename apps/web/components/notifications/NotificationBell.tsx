"use client";

import Link from "next/link";
import styled from "styled-components";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/notifications/useNotifications";
import { NotificationToast } from "./NotificationToast";

const BellLink = styled(Link)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  color: ${({ theme }) => theme.color.textSoft};
  transition: background 0.18s ease, color 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.text};
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 2px;
  right: 1px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.66rem;
  font-weight: 800;
  line-height: 1;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  box-shadow: 0 0 0 2px ${({ theme }) => theme.color.bg};
`;

/**
 * Header bell with a live unread badge, plus the arrival toast.
 *
 * The toast rides along here because the bell is the one component present on
 * every signed-in page — mounting it once keeps a new ride visible wherever the
 * user happens to be.
 */
export function NotificationBell({ userId }: { userId: string }) {
  const { unread, incoming } = useNotifications(userId);

  return (
    <>
      <BellLink
        href="/notifications"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
      >
        <Bell size={19} strokeWidth={2.2} />
        {unread > 0 && <Badge>{unread > 99 ? "99+" : unread}</Badge>}
      </BellLink>
      <NotificationToast notification={incoming} />
    </>
  );
}
