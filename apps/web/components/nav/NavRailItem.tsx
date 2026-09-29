"use client";

import Link from "next/link";
import styled from "styled-components";
import { RAIL_COMPACT_MAX } from "@/lib/nav/rail";
import type { NavItem } from "./nav-items";

const Row = styled(Link)<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  height: 52px;
  padding-inline: ${({ $collapsed }) => ($collapsed ? "0" : "12px")};
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "flex-start")};
  width: ${({ $collapsed }) => ($collapsed ? "52px" : "auto")};
  margin-inline: ${({ $collapsed }) => ($collapsed ? "auto" : "0")};
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  position: relative;
  transition: background 0.18s ease, color 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurface};
  }

  &[data-active="true"] {
    color: ${({ theme }) => theme.color.onSurface};
    font-weight: 800;
  }

  &:focus-visible {
    outline-offset: -3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (min-width: 900px) and (max-width: ${RAIL_COMPACT_MAX}px) {
    padding-inline: 0;
    justify-content: center;
    width: 52px;
    margin-inline: auto;
  }
`;

const Label = styled.span<{ $collapsed: boolean }>`
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  ${({ $collapsed }) =>
    $collapsed &&
    `
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    `}

  @media (min-width: 900px) and (max-width: ${RAIL_COMPACT_MAX}px) {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -5px;
  left: 14px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1;
`;

const Well = styled.span`
  position: relative;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
`;

export function NavRailItem({
  item,
  active,
  current,
  collapsed,
  badgeCount,
}: {
  item: NavItem;
  active: boolean;
  current: boolean;
  collapsed: boolean;
  badgeCount?: number;
}) {
  const Icon = item.icon;

  return (
    <Row
      href={item.href}
      data-active={active ? "true" : "false"}
      aria-current={current ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      aria-label={
        badgeCount ? `${item.label}, ${badgeCount} unread` : undefined
      }
      $collapsed={collapsed}
    >
      <Well aria-hidden="true">
        <Icon size={26} weight={active ? "fill" : "regular"} />
        {badgeCount ? <Badge>{badgeCount > 99 ? "99+" : badgeCount}</Badge> : null}
      </Well>
      <Label $collapsed={collapsed}>{item.label}</Label>
    </Row>
  );
}
