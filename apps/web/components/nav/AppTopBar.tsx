"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { m } from "motion/react";
import { CaretDown, CircleNotch, SignOut, X } from "@/components/icons";
import { spring } from "@/lib/motion";
import { signOutAction } from "@/lib/auth/actions";
import { Avatar } from "@/components/profile/Avatar";
import { Brand } from "@/components/ui/Brand";
import { MorphMenu } from "@/components/ui/MorphMenu";
import { Z } from "@/lib/z";
import { TOPBAR_H, TOPBAR_H_SM } from "@/lib/nav/rail";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { Profile } from "@/lib/auth/types";
import { ACCOUNT_NAV, isNavItemActive, type NavItem } from "./nav-items";

const onGreenAt = (pct: number) =>
  `color-mix(in oklab, ${nocturne.onGreen} ${pct}%, transparent)`;

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
  background: ${nocturne.greenDeep};
  color: ${nocturne.onGreen};

  @media (max-width: 960px) {
    height: ${TOPBAR_H_SM}px;
    gap: 16px;
  }

  @media (max-width: 899px) {
    transition: transform ${dur.enter} ${ease.enter};

    [data-chrome="hidden"] & {
      transform: translateY(-100%);
      transition: transform ${dur.exit} ${ease.exit};
    }
  }
`;

const BrandSlot = styled.div`
  flex: none;
  display: flex;
  align-items: center;

  a {
    display: flex;
    align-items: center;
    color: ${nocturne.onGreen};
  }
  img,
  svg {
    width: auto;
    height: 34px;
    max-width: 120px;
    display: block;
  }

  @media (max-width: 960px) {
    img,
    svg {
      height: 28px;
    }
  }
`;

const Cluster = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
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
  color: ${({ $active }) => ($active ? nocturne.onGreen : onGreenAt(78))};
  background: ${({ $active }) => ($active ? onGreenAt(14) : "transparent")};
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  svg {
    flex: none;
    color: ${({ $active }) => ($active ? nocturne.lime : onGreenAt(70))};
    transition:
      color ${dur.state} ${ease.standard},
      transform ${dur.state} ${ease.enter};
  }

  @media (hover: hover) {
    &:hover {
      background: ${onGreenAt(12)};
      color: ${nocturne.onGreen};
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
    background: ${onGreenAt(20)};
    transform: scale(0.97);
  }
  &:focus-visible {
    background: ${onGreenAt(12)};
    color: ${nocturne.onGreen};
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
  min-height: 44px;
  padding: 0 16px;
  border-radius: 100px;
  color: ${onGreenAt(82)};
  font-size: 15.5px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${onGreenAt(12)};
      color: ${nocturne.onGreen};
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
  min-height: 44px;
  padding: 0 20px;
  border-radius: 100px;
  background: ${nocturne.onGreen};
  color: ${nocturne.greenDeep};
  font-size: 15.5px;
  font-weight: 700;
  white-space: nowrap;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  svg {
    color: ${nocturne.green};
    transition: color ${dur.state} ${ease.standard};
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
  background: ${nocturne.onGreen};
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
    padding: 4px;
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

const MenuRule = styled.hr`
  margin: 6px 8px;
  border: none;
  border-top: 1px solid ${nocturne.line};
`;

const spinOnce = keyframes`to { transform: rotate(360deg); }`;

const MenuSignOut = styled.button`
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: none;
  border-radius: 13px;
  background: transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  text-align: left;
  color: ${nocturne.danger};
  cursor: pointer;
  transition: background ${dur.state} ${ease.standard};

  svg {
    flex: none;
    color: ${nocturne.danger};
  }
  .spin {
    animation: ${spinOnce} 0.9s linear infinite;
  }

  &:hover:not(:disabled),
  &:focus-visible {
    background: color-mix(in oklab, ${nocturne.danger} 12%, transparent);
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.danger};
    outline-offset: -2px;
  }
  &:disabled {
    cursor: progress;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    .spin {
      animation: none;
    }
  }
`;

const FaceSwap = styled.span`
  position: relative;
  display: inline-grid;
  flex: none;
  width: 36px;
  height: 36px;

  > * {
    grid-area: 1 / 1;
  }

  .x {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${nocturne.greenDeep};
    color: ${nocturne.lime};
  }
`;

const HIDDEN_FACE = { opacity: 0, scale: 0.5, rotate: 60 };
const SHOWN = { opacity: 1, scale: 1, rotate: 0 };
const HIDDEN_X = { opacity: 0, scale: 0.5, rotate: -90 };

function AccountFace({ profile, closing = false }: { profile: Profile; closing?: boolean }) {
  return (
    <>
      <FaceSwap>
        <m.span initial={false} animate={closing ? HIDDEN_FACE : SHOWN} transition={spring.morph}>
          <Avatar name={profile.full_name} src={profile.avatar_url} size={36} />
        </m.span>
        <m.span
          className="x"
          aria-hidden="true"
          initial={false}
          animate={closing ? SHOWN : HIDDEN_X}
          transition={spring.morph}
        >
          <X size={18} weight="bold" />
        </m.span>
      </FaceSwap>
      <span className="who">{(profile.full_name || "Account").split(/\s+/)[0]}</span>
      <CaretDown className="chev" size={17} aria-hidden />
    </>
  );
}

function SignOutItem() {
  const { pending } = useFormStatus();
  return (
    <MenuSignOut type="submit" role="menuitem" disabled={pending} aria-busy={pending}>
      {pending ? <CircleNotch className="spin" size={21} /> : <SignOut size={21} />}
      {pending ? "Signing out…" : "Sign out"}
    </MenuSignOut>
  );
}

const AccountPending = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 3px 14px 3px 3px;

  .disc,
  .word {
    background: ${onGreenAt(16)};
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <Bar data-chrome-bar="">
      <BrandSlot>
        <Brand href="/" light priority />
      </BrandSlot>

      <Cluster>
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
            <MenuWrap>
              <Trigger
                ref={triggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Account menu for ${profile.full_name || "your account"}`}
                onClick={() => setOpen((v) => !v)}
              >
                <AccountFace profile={profile} />
              </Trigger>

              <MorphMenu
                open={open}
                onClose={() => setOpen(false)}
                triggerRef={triggerRef}
                label="Account"
                align="end"
                head={(close, isOpen) => (
                  <Trigger
                    type="button"
                    aria-expanded="true"
                    aria-label="Close account menu"
                    tabIndex={-1}
                    onClick={close}
                  >
                    <AccountFace profile={profile} closing={isOpen} />
                  </Trigger>
                )}
              >
                {ACCOUNT_NAV.map((item) => (
                  <MenuA
                    key={item.key}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    <NavGlyph icon={item.icon} size={21} />
                    {item.label}
                  </MenuA>
                ))}
                <MenuRule role="separator" />
                <form action={signOutAction}>
                  <SignOutItem />
                </form>
              </MorphMenu>
            </MenuWrap>
          </>
        ) : (
          <>
            <LogIn href={signInHref}>Sign in</LogIn>
            <SignUp href="/auth/sign-up">
              Sign up
            </SignUp>
          </>
        )}
      </Cluster>
    </Bar>
  );
}
