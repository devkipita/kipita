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
import { Drawer, DrawerBody, DrawerFooter, useIsSheet } from "@/components/ui/Drawer";
import { ActivityButton } from "./ActivityButton";
import { NewDot } from "@/components/ui/NewDot";
import { CountBadge } from "@/components/ui/CountBadge";
import { Z } from "@/lib/z";
import { TOPBAR_H, TOPBAR_H_SM } from "@/lib/nav/rail";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { Profile } from "@/lib/auth/types";
import { ACCOUNT_NAV, SHEET_LEAD_NAV, isNavItemActive, type NavCounts, type NavItem } from "./nav-items";

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
  gap: 10px;
  margin-left: auto;

  @media (max-width: 599px) {
    gap: 4px;
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
  align-self: stretch;
  align-items: stretch;
  gap: 4px;
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
  padding: 0 14px;
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? 800 : 700)};
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: ${({ $active }) => ($active ? nocturne.onGreen : onGreenAt(72))};
  transition:
    color 160ms ease,
    transform ${dur.press} ${ease.standard};

  .well {
    --icon-knockout: ${nocturne.greenDeep};
    position: relative;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    color: ${({ $active }) => ($active ? nocturne.lime : "currentColor")};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${nocturne.onGreen};
    }
    &:hover ${Glyph} svg:first-child {
      opacity: 0;
    }
    &:hover ${Glyph} svg:last-child {
      opacity: 1;
    }
  }
  &:active .well {
    transform: scale(0.92);
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: -4px;
    border-radius: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active .well {
      transform: none;
    }
  }
`;

const NavActive = styled(m.span)`
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: ${nocturne.lime};
  pointer-events: none;
`;

const NavCount = styled.span`
  display: grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  margin-right: -4px;
  padding: 0 7px;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font-size: 12.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
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
  height: 44px;
  padding: 0 14px 0 5px;
  border: none;
  border-radius: 100px;
  background: ${onGreenAt(10)};
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform ${dur.press} ${ease.standard};

  .who {
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chev {
    color: ${onGreenAt(70)};
    transition:
      color 160ms ease,
      transform 240ms ${ease.standard};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${onGreenAt(16)};
    }
    &:hover .chev {
      color: ${nocturne.onGreen};
    }
  }
  &[aria-expanded="true"] {
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
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
    .chev {
      transition: none;
    }
    &:active {
      transform: none;
    }
  }

  @media (max-width: 599px) {
    gap: 0;
    width: 44px;
    padding: 0;
    justify-content: center;
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

const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 2px 8px;
  padding: 4px 12px 18px;
  border-bottom: 1px solid ${nocturne.line};

  .name {
    display: block;
    font-size: 19px;
    font-weight: 700;
    line-height: 1.3;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  .contact {
    display: block;
    margin-top: 2px;
    font-size: 15px;
    color: ${nocturne.muted};
    overflow-wrap: anywhere;
  }
`;

const AccountBody = styled(DrawerBody)`
  gap: 2px;
  padding: 0 12px 12px;
`;

const SheetLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  padding: 8px 12px 8px 8px;
  border-radius: 16px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${nocturne.cream};
  -webkit-tap-highlight-color: transparent;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform ${dur.press} ${ease.standard};

  .well {
    --icon-knockout: ${nocturne.surface2};
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${nocturne.surface2};
    color: ${nocturne.accent};
    transition:
      background 160ms ease,
      color 160ms ease;
  }
  .label {
    flex: 1;
    min-width: 0;
  }

  &[aria-current="page"] {
    background: ${nocturne.surface2};

    .well {
      --icon-knockout: ${nocturne.lime};
      background: ${nocturne.lime};
      color: ${nocturne.greenDeep};
    }
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${nocturne.surface2};
    }
    &:hover .well {
      --icon-knockout: ${nocturne.lime};
      background: ${nocturne.lime};
      color: ${nocturne.greenDeep};
    }
  }
  &:active {
    transform: scale(0.98);
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.accent};
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const AccountFoot = styled(DrawerFooter)`
  padding-inline: 12px;

  > form {
    flex: 1;
  }
  button {
    min-height: 56px;
    font-size: 17px;
  }
  button svg {
    width: 24px;
    height: 24px;
  }
`;

function SignOutItem({ inMenu = true }: { inMenu?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <MenuSignOut
      type="submit"
      role={inMenu ? "menuitem" : undefined}
      disabled={pending}
      aria-busy={pending}
    >
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
  counts,
}: {
  items: NavItem[];
  profile: Profile | null;
  signInHref: string;
  pending?: boolean;
  counts?: NavCounts;
}) {
  const pathname = usePathname() ?? "/";
  const sheet = useIsSheet();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  const accountLinks = ACCOUNT_NAV.map((item) => (
    <MenuA key={item.key} href={item.href} role="menuitem" onClick={() => setOpen(false)}>
      <NavGlyph icon={item.icon} size={21} />
      {item.label}
    </MenuA>
  ));

  const sheetLinks = [...SHEET_LEAD_NAV, ...ACCOUNT_NAV].map((item) => {
    const active = isNavItemActive(item, pathname);
    const count = item.badge ? (counts?.[item.badge] ?? 0) : 0;
    return (
      <SheetLink
        key={item.key}
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={count ? `${item.label}, ${count} new` : undefined}
        onClick={() => setOpen(false)}
      >
        <span className="well" aria-hidden="true">
          <NavGlyph icon={item.icon} size={26} on={active} />
        </span>
        <span className="label">{item.label}</span>
        {count ? <NavCount aria-hidden="true">{count > 99 ? "99+" : count}</NavCount> : null}
      </SheetLink>
    );
  });

  return (
    <Bar data-chrome-bar="">
      <BrandSlot>
        <Brand href="/" light priority />
      </BrandSlot>

      <Links aria-label="Main">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname);
          const count = item.badge ? (counts?.[item.badge] ?? 0) : 0;
          const fresh = !active && item.dot ? (counts?.[item.dot] ?? 0) > 0 : false;
          return (
            <NavA
              key={item.key}
              href={item.href}
              $active={active}
              aria-current={active ? "page" : undefined}
              aria-label={count ? `${item.label}, ${count} new` : fresh ? `${item.label}, new since your last visit` : undefined}
            >
              {active ? <NavActive layoutId="topnav-active" transition={spring.morph} aria-hidden="true" /> : null}
              <span className="well" aria-hidden="true">
                <NavGlyph icon={item.icon} size={26} on={active} />
                {count ? <CountBadge count={count} ring={nocturne.greenDeep} /> : fresh ? <NewDot ring={nocturne.greenDeep} label="" /> : null}
              </span>
              {item.label}
            </NavA>
          );
        })}
      </Links>

      <Cluster>
        {profile && !pending ? <ActivityButton userId={profile.id} /> : null}

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
                aria-haspopup={sheet ? "dialog" : "menu"}
                aria-expanded={open}
                aria-label={`Account menu for ${profile.full_name || "your account"}`}
                onClick={() => setOpen((v) => !v)}
              >
                <AccountFace profile={profile} />
              </Trigger>

              {sheet ? (
                <Drawer
                  open={open}
                  onClose={() => setOpen(false)}
                  title="Account"
                  fill
                  footer={
                    <AccountFoot>
                      <form action={signOutAction}>
                        <SignOutItem inMenu={false} />
                      </form>
                    </AccountFoot>
                  }
                >
                  <AccountBody>
                    <Identity>
                      <Avatar name={profile.full_name} src={profile.avatar_url} size={56} />
                      <div>
                        <span className="name">{profile.full_name || "Your account"}</span>
                        {profile.email || profile.phone ? (
                          <span className="contact">{profile.email || profile.phone}</span>
                        ) : null}
                      </div>
                    </Identity>
                    <nav aria-label="Account">{sheetLinks}</nav>
                  </AccountBody>
                </Drawer>
              ) : (
                <MorphMenu
                  open={open}
                  onClose={() => setOpen(false)}
                  triggerRef={triggerRef}
                  label="Account"
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
                  {accountLinks}
                  <MenuRule role="separator" />
                  <form action={signOutAction}>
                    <SignOutItem />
                  </form>
                </MorphMenu>
              )}
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
