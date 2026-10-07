"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import {
  DeviceMobile,
  House,
  MagnifyingGlass,
  MapTrifold,
} from "@/components/icons";
import { nocturne } from "../nocturne";

const ITEMS = [
  { key: "home", label: "Home", href: "/", section: "top", Icon: House },
  {
    key: "find",
    label: "Find",
    href: "/home",
    section: null,
    Icon: MagnifyingGlass,
  },
  {
    key: "routes",
    label: "Routes",
    href: "/#routes",
    section: "routes",
    Icon: MapTrifold,
  },
  {
    key: "app",
    label: "Get app",
    href: "/#download",
    section: "download",
    Icon: DeviceMobile,
  },
] as const;

const Bar = styled.nav`
  display: none;

  @media (max-width: 640px) {
    position: fixed;
    z-index: 60;
    left: 16px;
    right: 16px;
    bottom: calc(8px + env(safe-area-inset-bottom));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    height: 62px;
    padding: 4px;
    border: 1px solid rgba(18, 48, 31, 0.14);
    border-radius: 999px;
    background: #ffffff;
    box-shadow:
      0 2px 6px rgba(8, 42, 31, 0.12),
      0 10px 28px rgba(8, 42, 31, 0.2);
  }
`;

const Item = styled.a<{ $active: boolean }>`
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.1;
  color: ${({ $active }) => ($active ? "#0b2418" : "#2f3f36")};
  -webkit-font-smoothing: antialiased;
  background: ${({ $active }) => ($active ? "#e5ffc3" : "transparent")};
  -webkit-tap-highlight-color: transparent;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  svg {
    width: 24px;
    height: 24px;
  }
  &:active {
    opacity: 0.7;
  }
  &:focus-visible {
    outline: 2px solid #12301f;
    outline-offset: -2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export function MobileNav() {
  const pathname = usePathname();
  const onRides = pathname?.startsWith("/home") ?? false;
  const [section, setSection] = useState("top");

  useEffect(() => {
    if (onRides) return;
    const targets = ITEMS.map((i) =>
      i.section ? document.getElementById(i.section) : null,
    ).filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setSection(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [onRides]);

  return (
    <Bar aria-label="Section navigation">
      {ITEMS.map(({ key, label, href, section: id, Icon }) => {
        const active = onRides ? key === "find" : id === section;
        return (
          <Item
            key={key}
            href={href}
            $active={active}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={24} weight={active ? "fill" : "regular"} />
            <span>{label}</span>
          </Item>
        );
      })}
    </Bar>
  );
}
