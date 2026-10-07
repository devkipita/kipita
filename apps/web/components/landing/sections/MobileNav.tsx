"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Car, DeviceMobile, MagnifyingGlass, Path } from "@/components/icons";
import { nocturne } from "../nocturne";

const ITEMS = [
  { id: "top", label: "Home", Icon: Car },
  { id: "routes", label: "Routes", Icon: Path },
  { id: "drive", label: "Drive", Icon: MagnifyingGlass },
  { id: "download", label: "Get app", Icon: DeviceMobile },
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
  font-size: 9px;
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
  const [active, setActive] = useState<string>("top");

  useEffect(() => {
    const targets = ITEMS.map((i) => document.getElementById(i.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <Bar aria-label="Section navigation">
      {ITEMS.map(({ id, label, Icon }) => (
        <Item
          key={id}
          href={`#${id}`}
          $active={active === id}
          aria-current={active === id ? "true" : undefined}
        >
          <Icon size={20} />
          <span>{label}</span>
        </Item>
      ))}
    </Bar>
  );
}
