"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { CaretDown } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { Brand } from "@/components/ui/Brand";
import { Z } from "@/lib/z";
import { TOPBAR_H, TOPBAR_H_SM } from "@/lib/nav/rail";
import { nocturne } from "@/lib/nocturne";
import type { Profile } from "@/lib/auth/types";
import { ACCOUNT_NAV, isNavItemActive, type NavItem } from "./nav-items";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: ${Z.appTopBar};
  height: ${TOPBAR_H}px;
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 max(var(--page-pad), env(safe-area-inset-left)) 0
    max(var(--page-pad), env(safe-area-inset-right));
  background: ${nocturne.bg};
  color: ${nocturne.cream};

  @media (max-width: 960px) {
    height: ${TOPBAR_H_SM}px;
    gap: 16px;
  }
`;

const BrandSlot = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  padding: 5px 15px;
  border-radius: 999px;
  background: ${nocturne.greenDeep};

  a {
    display: flex;
    align-items: center;
    color: #ffffff;
  }
  img,
  svg {
    width: auto;
    height: 34px;
    max-width: 120px;
    display: block;
  }

  @media (max-width: 960px) {
    padding: 4px 11px;

    img,
    svg {
      height: 28px;
    }
  }
`;

const Cluster = styled.div<{ $bare: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 5px;
  border-radius: 999px;
  background: ${nocturne.greenDeep};

  @media (max-width: 960px) {
    padding: ${({ $bare }) => ($bare ? "0" : "4px")};
    background: ${({ $bare }) => ($bare ? "transparent" : nocturne.greenDeep)};
  }
`;

const Glyph = styled.span<{ $on?: boolean }>`
  position: relative;
  display: inline-flex;
  flex: none;
  line-height: 0;

  svg {
    display: block;
    transition: opacity 0.16s ease;
  }
  svg:first-child {
    opacity: ${({ $on }) => ($on ? 0 : 1)};
  }
  svg:last-child {
    position: absolute;
    inset: 0;
    opacity: ${({ $on }) => ($on ? 1 : 0)};
  }
`;

function NavGlyph({
  icon: Icon,
  size,
  on,
}: {
  icon: NavItem["icon"];
  size: number;
  on?: boolean;
}) {
  return (
    <Glyph $on={on} aria-hidden>
      <Icon size={size} />
      <Icon size={size} weight="fill" />
    </Glyph>
  );
}

const Links = styled.nav`
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;

  @media (max-width: 960px) {
    display: none;
  }
`;

const NavA = styled(Link)<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 8px 14px;
  border-radius: 100px;
  font-size: 15.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  white-space: nowrap;
  color: ${({ $active }) => ($active ? "#ffffff" : "rgba(255,255,255,0.78)")};
  background: ${({ $active }) =>
    $active ? "rgba(255,255,255,0.14)" : "transparent"};
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.12s ease;

  svg {
    flex: none;
    color: ${({ $active }) => ($active ? nocturne.lime : "rgba(255,255,255,0.7)")};
    transition:
      color 0.18s ease,
      transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @media (hover: hover) {
    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }
    &:hover svg {
      color: ${nocturne.lime};
      transform: translateY(-1px);
    }
    &:hover ${Glyph} svg:first-child {
      opacity: 0;
    }
    &:hover ${Glyph} svg:last-child {
      opacity: 1;
    }
  }
  &:active {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(0.97);
  }
  &:focus-visible {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    outline: 2px solid ${nocturne.lime};
    outline-offset: 3px;
  }
  &:focus-visible ${Glyph} svg:first-child {
    opacity: 0;
  }
  &:focus-visible ${Glyph} svg:last-child {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover svg,
    &:active {
      transform: none;
    }
  }
`;

const LogIn = styled(Link)`
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 100px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 15.5px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background 0.18s ease,
    color 0.18s ease;

  @media (hover: hover) {
    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 3px;
  }
`;

const SignUp = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 40px;
  padding: 0 20px;
  border-radius: 100px;
  background: #ffffff;
  color: ${nocturne.greenDeep};
  font-size: 15.5px;
  font-weight: 700;
  white-space: nowrap;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.12s ease;

  svg {
    color: ${nocturne.green};
    transition: color 0.18s ease;
  }
  @media (hover: hover) {
    &:hover {
      background: ${nocturne.lime};
    }
    &:hover svg {
      color: ${nocturne.greenDeep};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active {
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
  gap: 10px;
  padding: 3px 14px 3px 3px;
  border: none;
  border-radius: 100px;
  background: #ffffff;
  color: ${nocturne.greenDeep};
  font: inherit;
  font-size: 15.5px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.12s ease;

  .who {
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chev {
    color: ${nocturne.green};
    transition:
      color 0.18s ease,
      transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.lime};
    }
    &:hover .chev {
      color: ${nocturne.greenDeep};
      transform: translateY(2px);
    }
  }
  &[aria-expanded="true"] {
    background: ${nocturne.lime};
  }
  &[aria-expanded="true"] .chev {
    color: ${nocturne.greenDeep};
    transform: rotate(180deg);
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    .chev {
      transition: none;
    }
    &:hover .chev,
    &:active {
      transform: none;
    }
  }

  @media (max-width: 599px) {
    gap: 0;
    padding: 0;
    border-radius: 50%;
    line-height: 0;
    background: transparent;

    .who,
    .chev {
      display: none;
    }
  }
`;

const shimmer = keyframes`
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
`;

const menuIn = keyframes`
  from { opacity: 0; transform: translateY(-10px) scale(0.97); }
  to   { opacity: 1; transform: none; }
`;

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
  &:hover ${Glyph} svg:first-child,
  &:focus-visible ${Glyph} svg:first-child {
    opacity: 0;
  }
  &:hover ${Glyph} svg:last-child,
  &:focus-visible ${Glyph} svg:last-child {
    opacity: 1;
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.accent};
    outline-offset: -2px;
  }
`;

const AccountPending = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 3px 14px 3px 3px;

  .disc,
  .word {
    background: rgba(255, 255, 255, 0.16);
    animation: ${shimmer} 1.2s ease-in-out infinite;
  }
  .disc {
    width: 36px;
    height: 36px;
    border-radius: 50%;
  }
  .word {
    width: 74px;
    height: 13px;
    border-radius: 999px;
  }

  @media (max-width: 599px) {
    padding: 0;

    .word {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .disc,
    .word {
      animation: none;
    }
  }
`;

export function AppTopBar({
  items,
  profile,
  signInHref,
  pending = false,
}: {
  items: NavItem[];
  profile: Profile | null;
  signInHref: string;
  pending?: boolean;
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

      <Cluster $bare={pending || !!profile}>
        <Links aria-label="Main">
          {items.map((item) => (
            <NavA
              key={item.key}
              href={item.href}
              $active={isNavItemActive(item, pathname)}
              aria-current={isNavItemActive(item, pathname) ? "page" : undefined}
            >
              <NavGlyph icon={item.icon} size={19} on={isNavItemActive(item, pathname)} />
              {item.label}
            </NavA>
          ))}
        </Links>

        {pending ? (
          <AccountPending aria-hidden>
            <span className="disc" />
            <span className="word" />
          </AccountPending>
        ) : profile ? (
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
                  size={36}
                />
                <span className="who">
                  {(profile.full_name || "Account").split(/\s+/)[0]}
                </span>
                <CaretDown className="chev" size={17} aria-hidden />
              </Trigger>

              {open && (
                <Menu role="menu">
                  {ACCOUNT_NAV.map((item) => (
                    <MenuA key={item.key} href={item.href} role="menuitem">
                      <NavGlyph icon={item.icon} size={21} />
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
              Sign up
            </SignUp>
          </>
        )}
      </Cluster>
    </Bar>
  );
}
