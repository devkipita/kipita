"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { m } from "motion/react";
import { ArrowLeft, CaretDown, X } from "@/components/icons";
import { usePageTitle } from "@/lib/nav/page-title";
import { spring } from "@/lib/motion";
import { Avatar } from "@/components/profile/Avatar";
import { Brand } from "@/components/ui/Brand";
import { MorphHeadBar, MorphMenu, morphHead } from "@/components/ui/MorphMenu";
import { AccountMenu, AccountWho } from "./AccountMenu";
import { Drawer, DrawerBody, useIsSheet } from "@/components/ui/Drawer";
import { ActivityButton } from "./ActivityButton";
import { NewDot } from "@/components/ui/NewDot";
import { CountBadge } from "@/components/ui/CountBadge";
import { Z } from "@/lib/z";
import { TOPBAR_H, TOPBAR_H_SM } from "@/lib/nav/rail";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { Profile } from "@/lib/auth/types";
import { SHEET_LEAD_NAV, isNavItemActive, type NavCounts, type NavItem } from "./nav-items";

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

const PhoneTitle = styled.div`
  display: none;

  @media (max-width: 960px) {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;

    .title {
      overflow: hidden;
      font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
      font-size: 20px;
      font-weight: 800;
      line-height: 28px;
      letter-spacing: -0.02em;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: ${nocturne.sage};
    }
  }
`;

const BackLink = styled(Link)`
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: color-mix(in oklab, ${nocturne.sage} 18%, transparent);
  color: ${nocturne.sage};
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (pointer: coarse) {
    &::after {
      content: "";
      position: absolute;
      inset: -4px;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: color-mix(in oklab, ${nocturne.sage} 28%, transparent);
    }
  }
  &:active {
    background: color-mix(in oklab, ${nocturne.sage} 34%, transparent);
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const BrandSlot = styled.div<{ $hideOnPhone?: boolean }>`
  flex: none;
  display: flex;
  align-items: center;

  @media (max-width: 960px) {
    display: ${({ $hideOnPhone }) => ($hideOnPhone ? "none" : "flex")};
  }

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

const AccountHead = styled(Trigger)`
  position: relative;
  ${morphHead(".face", ".who, .chev", 23)}
`;

const shimmer = keyframes`
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
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
      <FaceSwap className="face">
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
  gap: 12px;
  min-width: 0;
  margin: 0 0 8px;
  padding: 4px 8px 16px;
  border-bottom: 1px solid ${nocturne.line2};
`;

const AccountBody = styled(DrawerBody)`
  gap: 2px;
  padding: 0 12px 12px;
`;

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
  const router = useRouter();
  const pageTitle = usePageTitle(pathname);
  const sheet = useIsSheet();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const visits = useRef(0);

  useEffect(() => {
    visits.current += 1;
    setOpen(false);
  }, [pathname]);

  function goBack(event: React.MouseEvent<HTMLAnchorElement>) {
    if (visits.current < 2 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    router.back();
  }

  const close = () => setOpen(false);

  return (
    <Bar data-chrome-bar="">
      <BrandSlot $hideOnPhone={Boolean(pageTitle)}>
        <Brand href="/" light priority />
      </BrandSlot>
      {pageTitle && (
        <PhoneTitle>
          {pageTitle.back && (
            <BackLink href={pageTitle.back} aria-label={pageTitle.backLabel ?? "Go back"} onClick={goBack}>
              <ArrowLeft size={24} weight="bold" aria-hidden />
            </BackLink>
          )}
          <span className="title">{pageTitle.title}</span>
        </PhoneTitle>
      )}

      <Links aria-label="Main">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname);
          const count = item.badge ? (counts?.[item.badge] ?? 0) : 0;
          const freshCount = !active && item.dot ? (counts?.[item.dot] ?? 0) : 0;
          const fresh = freshCount > 0;
          return (
            <NavA
              key={item.key}
              href={item.href}
              $active={active}
              aria-current={active ? "page" : undefined}
              aria-label={count ? `${item.label}, ${count} new` : fresh ? `${item.label}, ${freshCount} new since your last visit` : undefined}
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
                <Drawer open={open} onClose={close} title="Account" fill>
                  <AccountBody>
                    <Identity>
                      <Avatar name={profile.full_name} src={profile.avatar_url} size={56} />
                      <AccountWho profile={profile} />
                    </Identity>
                    <nav aria-label="Account">
                      <AccountMenu counts={counts} size="sheet" lead={SHEET_LEAD_NAV} onNavigate={close} />
                    </nav>
                  </AccountBody>
                </Drawer>
              ) : (
                <MorphMenu
                  open={open}
                  onClose={close}
                  triggerRef={triggerRef}
                  label="Account"
                  kind="dialog"
                  width={340}
                  head={(shut, isOpen) => (
                    <>
                      <MorphHeadBar data-open={isOpen ? "true" : "false"}>
                        <AccountWho profile={profile} avatar />
                      </MorphHeadBar>
                      <AccountHead
                        type="button"
                        data-morph={isOpen ? "open" : "closed"}
                        aria-expanded="true"
                        aria-label="Close account menu"
                        onClick={shut}
                      >
                        <AccountFace profile={profile} closing={isOpen} />
                      </AccountHead>
                    </>
                  )}
                >
                  <nav aria-label="Account">
                    <AccountMenu counts={counts} size="menu" onNavigate={close} />
                  </nav>
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
