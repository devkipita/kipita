"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled, { css } from "styled-components";
import { Moon, SignOut } from "@/components/icons";
import { useOptionalAppMode } from "@/components/nav/AppShell";
import { useThemeMode } from "@/components/providers/ThemeRuntimeProvider";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { Avatar } from "@/components/profile/Avatar";
import { RollingNumber } from "@/components/ui/Counter";
import { Switch } from "@/components/ui/Switch";
import { signOutAction } from "@/lib/auth/actions";
import type { Profile } from "@/lib/auth/types";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { ACCOUNT_NAV, isNavItemActive, type NavCounts, type NavItem } from "./nav-items";

type Size = "menu" | "sheet";

const THEME = "theme";

const GROUPS: { title: string; keys: string[] }[] = [
  { title: "Your trips", keys: ["trips", "notifications", "alerts"] },
  { title: "Money", keys: ["wallet", "referrals"] },
  { title: "Account and help", keys: ["profile", THEME, "help", "legal"] },
];

const layer = (pct: number) => `color-mix(in oklab, ${nocturne.cream} ${pct}%, transparent)`;

const Wrap = styled.div`
  display: grid;
  gap: 4px;
`;

const Who = styled.div`
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const WhoText = styled.span`
  display: grid;
  flex: 1 1 auto;
  min-width: 0;
`;

const WhoName = styled.span`
  overflow: hidden;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 800;
  line-height: 20px;
  letter-spacing: -0.01em;
  color: ${nocturne.cream};
  text-overflow: ellipsis;
  text-transform: capitalize;
  white-space: nowrap;
`;

const WhoContact = styled.span`
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
  color: ${nocturne.muted};
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Group = styled.section`
  display: grid;
  gap: 2px;

  h3 {
    margin: 0;
    padding: 12px 8px 4px;
    font-size: 13px;
    font-weight: 700;
    color: ${nocturne.muted2};
  }
`;

const rowShape = css<{ $size: Size }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: ${({ $size }) => ($size === "sheet" ? 56 : 48)}px;
  padding: 4px 8px 4px 4px;
  border-radius: 16px;
  color: ${nocturne.cream};
  font-size: ${({ $size }) => ($size === "sheet" ? 17 : 16)}px;
  font-weight: 600;
  text-decoration: none;

  .label {
    flex: 1;
    min-width: 0;
  }
`;

const Well = styled.span`
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${nocturne.popoverControl};
  color: ${nocturne.cream};
  --icon-knockout: ${nocturne.popoverControl};
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard};
`;

const rowInteractive = css`
  -webkit-tap-highlight-color: transparent;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${layer(6)};
    }
  }
  &:active {
    transform: scale(0.98);
    background: ${layer(10)};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const Row = styled(Link)<{ $size: Size }>`
  ${rowShape}
  ${rowInteractive}

  &[aria-current="page"] {
    font-weight: 700;
  }
  &[aria-current="page"] ${Well} {
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
    --icon-knockout: ${nocturne.lime};
  }
`;

const StaticRow = styled.div<{ $size: Size }>`
  ${rowShape}
`;

const Count = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  border-radius: 6px;
  background: ${({ theme }) => theme.color.error};
  color: ${({ theme }) => theme.color.onError};
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`;

const Rule = styled.hr`
  margin: 8px 8px 4px;
  border: 0;
  border-top: 1px solid ${nocturne.line2};
`;

const SignOutButton = styled.button<{ $size: Size }>`
  ${rowShape}
  ${rowInteractive}
  width: 100%;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.color.error};
  font: inherit;
  font-size: ${({ $size }) => ($size === "sheet" ? 17 : 16)}px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  ${Well} {
    background: ${({ theme }) => theme.color.errorContainer};
    color: ${({ theme }) => theme.color.onErrorContainer};
  }
  &:disabled {
    cursor: progress;
  }
`;

function SignOutRow({ size }: { size: Size }) {
  const { pending } = useFormStatus();
  return (
    <SignOutButton type="submit" $size={size} disabled={pending} aria-busy={pending}>
      <Well aria-hidden="true">{pending ? <ButtonOrb job="committing" on="surface" /> : <SignOut size={24} />}</Well>
      <span className="label">{pending ? "Signing out" : "Sign out"}</span>
    </SignOutButton>
  );
}

function ThemeRow({ size }: { size: Size }) {
  const { mode, toggle } = useThemeMode();
  return (
    <StaticRow $size={size}>
      <Well aria-hidden="true">
        <Moon size={24} weight={mode === "dark" ? "fill" : "regular"} />
      </Well>
      <span className="label" id="account-dark-mode">
        Dark mode
      </span>
      <Switch checked={mode === "dark"} onChange={toggle} label="Dark mode" />
    </StaticRow>
  );
}

function firstName(full: string | null | undefined): string {
  return (full ?? "").trim().split(/\s+/)[0] || "Your account";
}

export function AccountWho({ profile, avatar = false }: { profile: Profile; avatar?: boolean }) {
  const contact = profile.email || profile.phone;
  return (
    <Who>
      {avatar ? <Avatar name={profile.full_name} src={profile.avatar_url} size={40} /> : null}
      <WhoText>
        <WhoName title={profile.full_name || undefined}>{firstName(profile.full_name)}</WhoName>
        {contact ? <WhoContact title={contact}>{contact}</WhoContact> : null}
      </WhoText>
    </Who>
  );
}
export function AccountMenu({
  counts,
  size,
  lead,
  onNavigate,
}: {
  counts?: NavCounts;
  size: Size;
  lead?: NavItem[];
  onNavigate: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const mode = useOptionalAppMode()?.mode ?? "passenger";
  const byKey = new Map(ACCOUNT_NAV.map((item) => [item.key, item]));

  const row = (item: NavItem) => {
    const count = item.badge ? (counts?.[item.badge] ?? 0) : 0;
    const active = isNavItemActive(item, pathname);
    const Icon = item.icon;
    const label = item.key === "trips" && mode === "driver" ? "My rides" : item.label;
    return (
      <Row
        key={item.key}
        href={item.href}
        $size={size}
        data-row-link=""
        aria-current={active ? "page" : undefined}
        aria-label={count ? `${label}, ${count} new` : undefined}
        onClick={onNavigate}
      >
        <Well aria-hidden="true">
          <Icon size={24} weight={active ? "fill" : "regular"} />
        </Well>
        <span className="label">{label}</span>
        {count ? (
          <Count aria-hidden="true">
            <RollingNumber value={count} />
          </Count>
        ) : null}
      </Row>
    );
  };

  return (
    <Wrap>
      {lead?.length ? (
        <Group aria-labelledby="account-group-go">
          <h3 id="account-group-go">Go to</h3>
          {lead.map(row)}
        </Group>
      ) : null}
      {GROUPS.map((g) => (
        <Group key={g.title} aria-labelledby={`account-group-${g.keys[0]}`}>
          <h3 id={`account-group-${g.keys[0]}`}>{g.title}</h3>
          {g.keys.map((k) => {
            if (k === THEME) return <ThemeRow key={k} size={size} />;
            const item = byKey.get(k);
            return item ? row(item) : null;
          })}
        </Group>
      ))}
      <Rule />
      <form action={signOutAction}>
        <SignOutRow size={size} />
      </form>
    </Wrap>
  );
}
