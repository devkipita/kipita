"use client";

import { usePathname } from "next/navigation";
import styled from "styled-components";
import {
  SidebarSimple as PanelLeftClose,
  Sidebar as PanelLeftOpen,
} from "@/components/icons";
import { Brand } from "@/components/ui/Brand";
import { Z } from "@/lib/z";
import { RAIL_COMPACT_MAX } from "@/lib/nav/rail";
import type { Profile } from "@/lib/auth/types";
import {
  SECONDARY_NAV,
  isNavItemActive,
  isNavItemCurrent,
  type NavItem,
} from "./nav-items";
import { NavRailItem } from "./NavRailItem";
import { UserCluster } from "./UserCluster";

const Aside = styled.aside<{ $drawer?: boolean }>`
  position: sticky;
  top: 0;
  align-self: start;
  height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  z-index: ${Z.appRail};
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 10px 16px;
  border-right: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  @media (max-width: 899px) {
    display: ${({ $drawer }) => ($drawer ? "flex" : "none")};
  }

  ${({ $drawer }) =>
    $drawer &&
    `
      position: static;
      height: 100%;
      border-right: none;
      background: transparent;
      z-index: auto;
    `}
`;

const BrandBlock = styled.div<{ $collapsed: boolean }>`
  height: 52px;
  display: flex;
  align-items: center;
  padding-inline: ${({ $collapsed }) => ($collapsed ? "0" : "12px")};
  justify-content: ${({ $collapsed }) =>
    $collapsed ? "center" : "flex-start"};

  img {
    max-width: ${({ $collapsed }) => ($collapsed ? "36px" : "none")};
    object-fit: contain;
    object-position: left center;
  }

  @media (min-width: 900px) and (max-width: ${RAIL_COMPACT_MAX}px) {
    padding-inline: 0;
    justify-content: center;
    img {
      max-width: 36px;
    }
  }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
`;

const Spacer = styled.div`
  flex: 1;
`;

const Secondary = styled(List)`
  a {
    font-size: 0.98rem;
    height: 46px;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Foot = styled.div`
  display: grid;
  gap: 4px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
`;

const Toggle = styled.button<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding-inline: ${({ $collapsed }) => ($collapsed ? "0" : "14px")};
  justify-content: ${({ $collapsed }) =>
    $collapsed ? "center" : "flex-start"};
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: transparent;
  color: ${({ theme }) => theme.color.textSoft};
  font: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.text};
  }

  span {
    display: ${({ $collapsed }) => ($collapsed ? "none" : "inline")};
  }

  @media (min-width: 900px) and (max-width: ${RAIL_COMPACT_MAX}px) {
    padding-inline: 0;
    justify-content: center;
    span {
      display: none;
    }
  }
`;

export function NavRail({
  items,
  collapsed,
  onToggleCollapsed,
  profile,
  counts,
  modeSlot,
  signInHref,
  variant = "rail",
  onNavigate,
}: {
  items: NavItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  profile: Profile | null;
  counts?: Partial<Record<NonNullable<NavItem["badge"]>, number>>;
  modeSlot?: React.ReactNode;
  signInHref?: string;
  variant?: "rail" | "drawer";
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const drawer = variant === "drawer";
  const isCollapsed = drawer ? false : collapsed;

  return (
    <Aside $drawer={drawer}>
      <BrandBlock $collapsed={isCollapsed}>
        <Brand href={profile ? "/home" : "/"} priority />
      </BrandBlock>

      {modeSlot}

      <nav
        aria-label="Main"
        id={drawer ? undefined : "rail-nav"}
        onClick={drawer ? onNavigate : undefined}
      >
        <List>
          {items.map((item) => (
            <li key={item.key}>
              <NavRailItem
                item={item}
                active={isNavItemActive(item, pathname)}
                current={isNavItemCurrent(item, pathname)}
                collapsed={isCollapsed}
                badgeCount={item.badge ? counts?.[item.badge] : undefined}
              />
            </li>
          ))}
        </List>
      </nav>

      <Spacer />

      <nav aria-label="Support" onClick={drawer ? onNavigate : undefined}>
        <Secondary>
          {SECONDARY_NAV.filter((item) => profile || !item.requiresAuth).map(
            (item) => (
              <li key={item.key}>
                <NavRailItem
                  item={item}
                  active={isNavItemActive(item, pathname)}
                  current={isNavItemCurrent(item, pathname)}
                  collapsed={isCollapsed}
                />
              </li>
            ),
          )}
        </Secondary>
      </nav>

      <Foot>
        <UserCluster
          profile={profile}
          layout="rail"
          collapsed={isCollapsed}
          signInHref={signInHref}
        />
        {!drawer && (
          <Toggle
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="rail-nav"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            $collapsed={collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span>Collapse</span>
          </Toggle>
        )}
      </Foot>
    </Aside>
  );
}
