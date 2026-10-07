"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { CaretDown, UserCircle } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { Brand } from "@/components/ui/Brand";
import { Z } from "@/lib/z";
import { TOPBAR_H, TOPBAR_H_SM } from "@/lib/nav/rail";
import { nocturne } from "@/lib/nocturne";
import type { Profile } from "@/lib/auth/types";
import { ACCOUNT_NAV, isNavItemActive, type NavItem } from "./nav-items";

/** The Figma header: a forest band with white content, on every app page. */
const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: ${Z.appTopBar};
  height: ${TOPBAR_H}px;
  display: flex;
  align-items: center;
  gap: 42px;
  padding: 0 max(var(--page-pad), env(safe-area-inset-left)) 0
    max(var(--page-pad), env(safe-area-inset-right));
  background: ${nocturne.greenDeep};
  color: #ffffff;

  @media (max-width: 960px) {
    height: ${TOPBAR_H_SM}px;
    gap: 16px;
  }
`;

/** Figma sizes the mark at 136×54 in the header. */
const BrandSlot = styled.div`
  flex: none;
  display: flex;
  align-items: center;

  a {
    display: flex;
    align-items: center;
    color: #ffffff;
  }
  img,
  svg {
    width: auto;
    height: 54px;
    max-width: 150px;
    display: block;
  }

  @media (max-width: 960px) {
    img,
    svg {
      height: 44px;
    }
  }
`;

const Links = styled.nav`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  min-width: 0;

  @media (max-width: 960px) {
    display: none;
  }
`;

const NavA = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $active }) => ($active ? "#ffffff" : "rgba(255,255,255,0.83)")};
  background: ${({ $active }) =>
    $active ? "rgba(255,255,255,0.12)" : "transparent"};
  transition:
    background 0.18s ease,
    color 0.18s ease;

  svg {
    flex: none;
    color: ${({ $active }) => ($active ? "#e5ffc3" : "rgba(255,255,255,0.72)")};
    transition: color 0.18s ease;
  }

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }
  &:hover svg,
  &:focus-visible svg {
    color: #e5ffc3;
  }
  &:focus-visible {
    outline: 2px solid #e5ffc3;
    outline-offset: 2px;
  }
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
  flex: none;

  @media (max-width: 960px) {
    margin-left: auto;
  }
`;

const LogIn = styled(Link)`
  display: inline-flex;
  align-items: center;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 100px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 2px;
  }
  @media (max-width: 420px) {
    display: none;
  }
`;

const SignUp = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  padding: 0 23px;
  border-radius: 100px;
  background: #ffffff;
  color: ${nocturne.green};
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const MenuWrap = styled.div`
  position: relative;
`;

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  .who {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  svg {
    transition:
      color 0.16s ease,
      transform 0.2s ease;
  }

  &:hover,
  &[aria-expanded="true"] {
    background: rgba(255, 255, 255, 0.16);
  }
  &:hover svg,
  &[aria-expanded="true"] svg {
    color: #e5ffc3;
  }
  &[aria-expanded="true"] svg:last-child {
    transform: rotate(180deg);
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 2px;
  }

  @media (max-width: 599px) {
    gap: 0;
    padding: 0;
    border-radius: 50%;
    border-width: 2px;
    line-height: 0;

    .who,
    svg:last-child {
      display: none;
    }
  }
`;

const menuIn = keyframes`
  from { opacity: 0; transform: translateY(-10px) scale(0.97); }
  to   { opacity: 1; transform: none; }
`;

/** Sits on the page's card surface, not the navbar's forest. */
const Menu = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: ${Z.appTopBar + 1};
  min-width: 268px;
  padding: 8px;
  border-radius: 20px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
  box-shadow: ${nocturne.panelShadow};
  transform-origin: top right;
  animation: ${menuIn} 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/**
 * Hover tints the row lime and the icon with the readable accent — lime on a
 * white card is about 1.3:1, so it carries the row, not the glyph.
 */
const MenuA = styled(Link)`
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 14px;
  border-radius: 13px;
  font-size: 16px;
  font-weight: 600;
  color: ${nocturne.cream};
  transition:
    background 0.16s ease,
    color 0.16s ease;

  svg {
    flex: none;
    color: ${nocturne.muted2};
    transition: color 0.16s ease;
  }

  &:hover,
  &:focus-visible {
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  }
  &:hover svg,
  &:focus-visible svg {
    color: ${nocturne.greenDeep};
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.accent};
    outline-offset: -2px;
  }
`;

export function AppTopBar({
  items,
  profile,
  signInHref,
}: {
  items: NavItem[];
  profile: Profile | null;
  signInHref: string;
}) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <Bar>
      <BrandSlot>
        <Brand href="/" light priority />
      </BrandSlot>

      <Links aria-label="Main">
        {items.map((item) => (
          <NavA
            key={item.key}
            href={item.href}
            $active={isNavItemActive(item, pathname)}
            aria-current={isNavItemActive(item, pathname) ? "page" : undefined}
          >
            <item.icon size={18} aria-hidden />
            {item.label}
          </NavA>
        ))}
      </Links>

      <Right>
        {profile ? (
          <>
            <MenuWrap ref={wrapRef}>
              <Trigger
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                <Avatar
                  name={profile.full_name}
                  src={profile.avatar_url}
                  size={40}
                />
                <span className="who">
                  {(profile.full_name || "Account").split(/\s+/)[0]}
                </span>
                <CaretDown size={16} aria-hidden />
              </Trigger>

              {open && (
                <Menu role="menu">
                  {ACCOUNT_NAV.map((item) => (
                    <MenuA key={item.key} href={item.href} role="menuitem">
                      <item.icon size={21} aria-hidden />
                      {item.label}
                    </MenuA>
                  ))}
                </Menu>
              )}
            </MenuWrap>
          </>
        ) : (
          <>
            <LogIn href={signInHref}>Log in</LogIn>
            <SignUp href="/auth/sign-up">
              <UserCircle size={19} aria-hidden />
              Sign up
            </SignUp>
          </>
        )}
      </Right>
    </Bar>
  );
}
