"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import {
  Car,
  DeviceMobile,
  MagnifyingGlass,
  Path,
} from "@/components/icons";
import { nocturne } from "../nocturne";

const ITEMS = [
  { key: "home", label: "Home", href: "/", section: "top", Icon: Car },
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
    Icon: Path,
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
    left: 10px;
    right: 10px;
    bottom: calc(9px + env(safe-area-inset-bottom));
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 64px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    background: rgba(9, 43, 33, 0.96);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    box-shadow: 0 9px 35px rgba(8, 42, 31, 0.3);
  }
`;

const Item = styled.a<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 55px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $active }) =>
    $active ? nocturne.lime : "rgba(255, 255, 255, 0.6)"};
  transition: color 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
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
            <Icon size={20} />
            <span>{label}</span>
          </Item>
        );
      })}
    </Bar>
  );
}
