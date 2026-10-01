"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { Z } from "@/lib/z";
import { isNavItemActive, isNavItemCurrent, type NavItem } from "./nav-items";

const Bar = styled.nav`
  position: fixed;
  left: 50%;
  transform: translateX(calc(-50% - var(--scrollbar-gutter, 0px) / 2));
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: ${Z.bottomTabBar};
  width: min(380px, calc(100vw - 24px));
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.color.line};
  box-shadow: ${({ theme }) => theme.shadow.card};
  background: ${({ theme }) =>
    theme.mode === "dark" ? "rgba(29,32,30,0.82)" : "rgba(255,255,255,0.86)"};
  backdrop-filter: saturate(1.3) blur(18px);

  @supports not (backdrop-filter: blur(1px)) {
    background: ${({ theme }) => theme.color.surface};
  }

  @media (min-width: 900px) {
    display: none;
  }

  @media (forced-colors: active) {
    border: 1px solid CanvasText;
  }
`;

const Item = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 64px;
  height: 52px;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.textSoft};
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  position: relative;

  .well {
    display: grid;
    place-items: center;
    width: 44px;
    height: 28px;
    border-radius: 999px;
    transition: background 0.18s ease;
  }

  .label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  &[data-active="true"] {
    color: ${({ theme }) => theme.color.onPrimaryContainer};
    .well {
      background: ${({ theme }) => theme.color.primaryContainer};
    }
    .label {
      font-weight: 800;
    }
  }

  &:active {
    opacity: 0.7;
  }

  @media (prefers-reduced-motion: reduce) {
    .well {
      transition: none;
    }
  }
`;

const Dot = styled.span`
  position: absolute;
  top: 4px;
  right: 14px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.primary};
`;

export function BottomTabBar({
  items,
  counts,
}: {
  items: NavItem[];
  counts?: Partial<Record<NonNullable<NavItem["badge"]>, number>>;
}) {
  const pathname = usePathname() ?? "/";

  return (
    <Bar aria-label="Main">
      {items.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(item, pathname);
        return (
          <Item
            key={item.key}
            href={item.href}
            data-active={active ? "true" : "false"}
            aria-current={isNavItemCurrent(item, pathname) ? "page" : undefined}
          >
            <span className="well" aria-hidden="true">
              <Icon size={24} weight={active ? "fill" : "regular"} />
            </span>
            <span className="label">{item.shortLabel}</span>
            {item.badge && counts?.[item.badge] ? (
              <Dot aria-hidden="true" />
            ) : null}
          </Item>
        );
      })}
    </Bar>
  );
}
