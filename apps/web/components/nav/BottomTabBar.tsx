"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { Z } from "@/lib/z";
import { nocturne } from "@/lib/nocturne";
import { isNavItemActive, isNavItemCurrent, type NavItem } from "./nav-items";

const EASE = "cubic-bezier(0.2, 0, 0, 1)";

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
  box-shadow:
    0 1px 2px rgba(8, 28, 20, 0.08),
    0 8px 24px -8px rgba(8, 28, 20, 0.22);
  border: 1px solid ${nocturne.line2};
  background: ${nocturne.surface};

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
  color: ${nocturne.muted};
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  transition: color 0.18s ${EASE};

  .well {
    display: grid;
    place-items: center;
    width: 100%;
    max-width: 50px;
    height: 26px;
    border-radius: 999px;
    transition:
      background 0.22s ${EASE},
      transform 0.22s ${EASE};
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: 0.01em;
    transition: font-variation-settings 0.18s ${EASE};
  }

  &[data-active="true"] {
    color: ${nocturne.accent};

    .well {
      background: color-mix(in oklab, ${nocturne.accent} 15%, transparent);
    }
    .label {
      font-weight: 700;
    }
  }

  @media (hover: hover) {
    &:hover .well {
      background: color-mix(in oklab, ${nocturne.accent} 9%, transparent);
    }
    &[data-active="true"]:hover .well {
      background: color-mix(in oklab, ${nocturne.accent} 22%, transparent);
    }
  }

  &:focus-visible {
    outline: 2px solid ${nocturne.accent};
    outline-offset: 1px;
  }

  &:active .well {
    transform: scale(0.9);
    background: color-mix(in oklab, ${nocturne.accent} 24%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    .well {
      transition: none;
    }
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

const Count = styled.span`
  position: absolute;
  top: 0;
  left: calc(50% + 5px);
  display: grid;
  place-items: center;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font-size: 10.5px;
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
    <Bar aria-label="Main">
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
            aria-label={
              count ? `${item.label}, ${count} new` : item.label
            }
          >
            <span className="well" aria-hidden="true">
              <Icon
                size={23}
                weight={active ? "bold" : "regular"}
                {...(active ? {} : { strokeWidth: 1.7 })}
              />
            </span>
            <span className="label">{item.shortLabel}</span>
            {count ? (
              <Count aria-hidden="true">{count > 9 ? "9+" : count}</Count>
            ) : null}
          </Item>
        );
      })}
    </Bar>
  );
}

