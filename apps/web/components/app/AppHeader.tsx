"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { LifeBuoy } from "lucide-react";
import { Brand } from "@/components/ui/Brand";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Avatar } from "@/components/profile/Avatar";

const Bar = styled.header<{ $hidden: boolean }>`
  position: sticky;
  top: 0;
  z-index: 40;
  background: ${({ theme }) => theme.color.bg}f2;
  backdrop-filter: saturate(1.2) blur(10px);
  transform: translateY(${({ $hidden }) => ($hidden ? "-100%" : "0")});
  transition: transform 0.3s ease;
`;

const Inner = styled.div`
  max-width: 900px;
  margin: 0 auto;
  height: 50px;
  padding: 0 clamp(16px, 4vw, 28px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Right = styled.nav`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const NavLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.color.textSoft};
  text-decoration: none;
  transition: background 0.18s ease, color 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.text};
  }

  @media (max-width: 520px) {
    span {
      display: none;
    }
  }
`;

const Chip = styled(Link)`
  display: inline-flex;
  border-radius: 999px;
  transition: transform 0.15s ease;
  &:hover {
    transform: translateY(-1px);
  }
`;

/** Sticky top navigation for the signed-in account area. */
export function AppHeader({
  name,
  avatarUrl,
  showProfileChip = true,
}: {
  name?: string;
  avatarUrl?: string | null;
  showProfileChip?: boolean;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      // Hide when scrolling down past the header; reveal on any upward scroll.
      if (y > last && y > 70) setHidden(true);
      else if (y < last) setHidden(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Bar $hidden={hidden}>
      <Inner>
        <Brand href="/" priority />
        <Right>
          <NavLink href="/help">
            <LifeBuoy size={17} strokeWidth={2.2} />
            <span>Help</span>
          </NavLink>
          <ThemeToggle />
          {showProfileChip && name !== undefined && (
            <Chip href="/profile" aria-label="Your profile">
              <Avatar name={name} src={avatarUrl} size={42} />
            </Chip>
          )}
        </Right>
      </Inner>
    </Bar>
  );
}
