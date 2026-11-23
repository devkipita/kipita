"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { m } from "motion/react";
import { Z } from "@/lib/z";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { spring } from "@/lib/motion";
import { NewDot } from "@/components/ui/NewDot";
import { CountBadge } from "@/components/ui/CountBadge";
import { isNavItemActive, isNavItemCurrent, type NavCounts, type NavItem } from "./nav-items";

const Bar = styled.nav`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: max(8px, env(safe-area-inset-bottom));
  z-index: ${Z.bottomTabBar};
  width: min(400px, calc(100% - 24px));
  height: 60px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.pill};
  box-shadow:
    inset 0 0 0 1px ${nocturne.line},
    ${nocturne.popoverShadow};
  background: ${nocturne.surface};
  transition: translate ${dur.enter} ${ease.enter};

  [data-chrome="hidden"] & {
    translate: 0 calc(100% + 24px);
    transition: translate ${dur.exit} ${ease.exit};
  }

  @media (min-width: 900px) {
    display: none;
  }

  @media (forced-colors: active) {
    border: 1px solid CanvasText;
  }
`;

const pillTone = (mode: "light" | "dark") => (mode === "light" ? nocturne.greenDeep : nocturne.green);

const Item = styled(Link)`
  position: relative;
  display: grid;
  height: 52px;
  border-radius: 999px;
  color: ${({ theme }) => (theme.mode === "light" ? nocturne.greenDeep : nocturne.cream)};
  text-decoration: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;

  .well {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 100%;
    border-radius: 999px;
    transition:
      background-color ${dur.state} ${ease.standard},
      transform ${dur.press} ${ease.standard};
  }

  .glyph {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
  }

  .label {
    position: relative;
    z-index: 1;
    font-size: 12px;
    font-weight: 800;
    line-height: 16px;
    white-space: nowrap;
  }

  &[data-active="true"] {
    color: ${nocturne.onGreen};

    .label {
      font-weight: 900;
    }
  }

  &:focus-visible {
    color: ${nocturne.onGreen};

    .well {
      background-color: ${({ theme }) => pillTone(theme.mode)};
    }
  }

  @media (hover: hover) and (pointer: fine) {
    &[data-active="false"]:hover .well {
      background-color: ${({ theme }) => theme.color.surfaceContainerHigh};
    }
  }

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }

  &:active .well {
    transform: scale(0.97);
  }

  @media (prefers-reduced-motion: reduce) {
    &:active .well {
      transform: none;
    }
  }

  @media (forced-colors: active) {
    &[data-active="true"] .well {
      outline: 1px solid CanvasText;
    }
  }
`;

const WellFill = styled(m.span)`
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: ${({ theme }) => pillTone(theme.mode)};
`;

export function BottomTabBar({
  items,
  counts,
}: {
  items: NavItem[];
  counts?: NavCounts;
}) {
  const pathname = usePathname() ?? "/";

  return (
    <Bar aria-label="Main" data-chrome-bar="">
      {items.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(item, pathname);
        const count = item.badge ? (counts?.[item.badge] ?? 0) : 0;
        const fresh = !active && item.dot ? (counts?.[item.dot] ?? 0) > 0 : false;
        return (
          <Item
            key={item.key}
            href={item.href}
            data-active={active ? "true" : "false"}
            aria-current={isNavItemCurrent(item, pathname) ? "page" : undefined}
            aria-label={count ? `${item.label}, ${count} new` : fresh ? `${item.label}, new since your last visit` : item.label}
          >
            <span className="well" aria-hidden="true">
              {active ? <WellFill layoutId="bottom-tab-well" transition={spring.morph} /> : null}
              <span className="glyph">
                <Icon size={24} weight={active ? "fill" : "regular"} />
                {count ? (
                  <CountBadge count={count} ring={nocturne.surface} max={9} />
                ) : fresh ? (
                  <NewDot ring={nocturne.surface} label="" />
                ) : null}
              </span>
              <span className="label">{item.shortLabel}</span>
            </span>
          </Item>
        );
      })}
    </Bar>
  );
}
