"use client";

import Link from "next/link";
import styled from "styled-components";
import { Avatar } from "@/components/profile/Avatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ButtonLink } from "@/components/ui/primitives";
import type { Profile } from "@/lib/auth/types";

const Shell = styled.div<{ $layout: "rail" | "bar"; $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: ${({ $layout }) => ($layout === "rail" ? "nowrap" : "wrap")};
  flex-direction: ${({ $layout, $collapsed }) =>
    $layout === "rail" && $collapsed ? "column" : "row"};
  justify-content: ${({ $layout, $collapsed }) =>
    $layout === "rail" && $collapsed ? "center" : "flex-start"};
`;

const Me = styled(Link)<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
  padding: 6px;
  border-radius: ${({ theme }) => theme.radius.pill};

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
  }

  .text {
    min-width: 0;
    display: ${({ $collapsed }) => ($collapsed ? "none" : "block")};
  }
  b {
    display: block;
    font-size: 0.9rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  small {
    display: block;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.color.textSoft};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export function UserCluster({
  profile,
  layout,
  collapsed = false,
  signInHref = "/auth/sign-in",
}: {
  profile: Profile | null;
  layout: "rail" | "bar";
  collapsed?: boolean;
  signInHref?: string;
}) {
  if (!profile) {
    return (
      <Shell $layout={layout} $collapsed={collapsed}>
        <ThemeToggle />
        <ButtonLink href={signInHref} $compact>
          Sign in
        </ButtonLink>
      </Shell>
    );
  }

  return (
    <Shell $layout={layout} $collapsed={collapsed}>
      <Me href="/profile" aria-label="Your profile" $collapsed={collapsed}>
        <Avatar name={profile.full_name} src={profile.avatar_url} size={36} />
        <span className="text">
          <b>{profile.full_name || "You"}</b>
          <small>View profile</small>
        </span>
      </Me>
      <NotificationBell userId={profile.id} />
      <ThemeToggle />
    </Shell>
  );
}
