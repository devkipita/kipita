"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { m } from "motion/react";
import { Z } from "@/lib/z";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { spring } from "@/lib/motion";
import { isNavItemActive, isNavItemCurrent, type NavItem } from "./nav-items";

const Bar = styled.nav`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: max(8px, env(safe-area-inset-bottom));
  z-index: ${Z.bottomTabBar};
  width: min(360px, calc(100% - 20px));
  height: 56px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  align-items: center;
  padding: 0 4px;
  border-radius: ${({ theme }) => theme.radius.pill};
  box-shadow: ${({ theme }) => theme.shadow.card};
  border: 1px solid ${nocturne.line2};
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

const Item = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  height: 48px;
  border-radius: 16px;
  color: ${nocturne.muted2};
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  transition: color ${dur.state} ${ease.standard};

  .well {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    max-width: 50px;
    height: 26px;
    border-radius: 999px;
    transition:
      background ${dur.state} ${ease.standard},
      transform ${dur.press} ${ease.standard};
  }

  .glyph {
    position: relative;
    display: grid;
    place-items: center;
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: 0.01em;
  }

  &[data-active="true"] {
    color: ${nocturne.greenDeep};

    .label {
      font-weight: 800;
    }
  }

  @media (hover: hover) {
    &[data-active="false"]:hover .well {
      background: color-mix(in oklab, ${nocturne.lime} 40%, transparent);
    }
  }

  &:focus-visible {
    outline: 2px solid ${nocturne.accent};
    outline-offset: 1px;
  }

  &:active .well {
    transform: scale(0.92);
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
  background: ${nocturne.lime};
`;

const Count = styled.span`
  position: absolute;
  top: 0;
  left: calc(50% + 10px);
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 2px ${nocturne.surface};
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
    <Bar aria-label="Main" data-chrome-bar="">
      {items.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(item, pathname);
        const count = item.badge ? (counts?.[item.badge] ?? 0) : 0;
        return (
          <Item
            key={item.key}
            href={item.href}
            data-active={active ? "true" : "false"}
            aria-current={isNavItemCurrent(item, pathname) ? "page" : undefined}
            aria-label={count ? `${item.label}, ${count} new` : item.label}
          >
            <span className="well" aria-hidden="true">
              {active ? <WellFill layoutId="bottom-tab-well" transition={spring.morph} /> : null}
              <span className="glyph">
                <Icon
                  size={23}
                  weight={active ? "bold" : "regular"}
                  {...(active ? {} : { strokeWidth: 1.7 })}
                />
              </span>
            </span>
            <span className="label">{item.shortLabel}</span>
            {count ? <Count aria-hidden="true">{count > 9 ? "9+" : count}</Count> : null}
          </Item>
        );
      })}
    </Bar>
  );
}
