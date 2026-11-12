"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import styled from "styled-components";
import {
  Bell,
  CaretRight,
  Grid,
  Lifebuoy,
  MagnifyingGlass,
  QuestionCircle,
  RouteTrip,
  SealCheck,
  SealPercent,
  Shield,
  SignOut,
  Tag,
  Ticket,
  ArrowUUpLeft,
  Users,
  Wallet,
} from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string; icon: (p: { size: number }) => ReactNode; count?: number };

const Frame = styled.div`
  min-height: 100dvh;
  display: flex;
  background: ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.text};

  @media (max-width: 900px) {
    flex-direction: column;
  }
`;

const Side = styled.aside`
  position: sticky;
  top: 0;
  width: 248px;
  height: 100dvh;
  flex: none;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  @media (max-width: 900px) {
    position: static;
    width: 100%;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
`;

const BrandRow = styled(Link)`
  height: 80px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.color.primary};
  font: 800 25px ${({ theme }) => theme.fontHeading};
  letter-spacing: -1px;
  text-decoration: none;

  b {
    margin-left: 2px;
    padding: 4px 7px;
    border-radius: 6px;
    color: ${({ theme }) => theme.color.muted};
    background: ${({ theme }) => theme.color.background};
    font: 700 10px ${({ theme }) => theme.font};
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  @media (max-width: 900px) {
    height: 60px;
    padding: 0 16px;
  }
`;

const Mark = styled.span`
  position: relative;
  width: 27px;
  height: 27px;
  display: inline-block;

  &::after {
    content: "";
    position: absolute;
    width: 23px;
    height: 5px;
    left: 1px;
    top: 11px;
    border-radius: 5px;
    background: currentColor;
    transform: rotate(-38deg);
  }
  i {
    position: absolute;
    z-index: 1;
    width: 7px;
    height: 7px;
    border: 2px solid ${({ theme }) => theme.color.surface};
    border-radius: 50%;
    background: currentColor;
  }
  i:first-child {
    left: 0;
    bottom: 1px;
  }
  i:nth-child(2) {
    left: 10px;
    top: 9px;
    background: #ea7747;
  }
  i:last-child {
    right: 0;
    top: 0;
  }
`;

const Nav = styled.nav`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;

  > small {
    margin: 14px 14px 4px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  @media (max-width: 900px) {
    padding: 0 12px 10px;
    flex-direction: row;
    overflow-x: auto;

    > small {
      display: none;
    }
  }
`;

const NavLink = styled(Link)<{ $on: boolean }>`
  min-height: 44px;
  padding: 0 14px;
  display: flex;
  flex: none;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  color: ${({ theme, $on }) => ($on ? theme.color.onPrimaryContainer : theme.color.textSoft)};
  background: ${({ theme, $on }) => ($on ? theme.color.primaryContainer : "transparent")};
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;

  &:hover {
    background: ${({ theme, $on }) => ($on ? theme.color.primaryContainer : theme.color.surfaceVariant)};
  }
  span {
    flex: 1;
    white-space: nowrap;
  }
  b {
    min-width: 24px;
    height: 22px;
    padding: 0 6px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: ${({ theme, $on }) => ($on ? theme.color.onPrimaryContainer : theme.color.muted)};
    background: ${({ theme, $on }) => ($on ? "rgba(255,255,255,.55)" : theme.color.background)};
    font-size: 11px;
  }
`;

const SideFoot = styled.div`
  margin-top: auto;
  padding: 12px;
  border-top: 1px solid ${({ theme }) => theme.color.line};

  button {
    width: 100%;
    min-height: 44px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 0;
    border-radius: 12px;
    color: ${({ theme }) => theme.color.textSoft};
    background: transparent;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  button:hover {
    background: ${({ theme }) => theme.color.surfaceVariant};
  }

  @media (max-width: 900px) {
    display: none;
  }
`;

const Workspace = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const Top = styled.header`
  position: sticky;
  z-index: 20;
  top: 0;
  min-height: 64px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  @media (max-width: 900px) {
    position: static;
    padding: 10px 16px;
    flex-wrap: wrap;
  }
`;

const GlobalSearch = styled.form`
  width: min(520px, 100%);
  height: 40px;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 12px;
  color: ${({ theme }) => theme.color.muted};
  background: ${({ theme }) => theme.color.background};

  input {
    width: 100%;
    border: 0;
    outline: 0;
    color: ${({ theme }) => theme.color.text};
    background: transparent;
    font: inherit;
    font-size: 13px;
  }
`;

const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Env = styled.span<{ $prod: boolean }>`
  height: 28px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 999px;
  color: ${({ theme }) => theme.color.textSoft};
  font-size: 11px;
  font-weight: 700;

  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $prod, theme }) => ($prod ? theme.color.success : theme.color.warning)};
  }
`;

const Bellish = styled(Link)`
  position: relative;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: ${({ theme }) => theme.color.textSoft};

  &:hover {
    background: ${({ theme }) => theme.color.surfaceVariant};
  }
  b {
    position: absolute;
    right: 1px;
    top: 0;
    min-width: 16px;
    height: 16px;
    padding: 0 3px;
    display: grid;
    place-items: center;
    border: 2px solid ${({ theme }) => theme.color.surface};
    border-radius: 8px;
    color: ${({ theme }) => theme.color.onError};
    background: ${({ theme }) => theme.color.error};
    font-size: 8px;
  }
`;

const Profile = styled.div`
  height: 46px;
  padding-left: 14px;
  display: flex;
  align-items: center;
  gap: 9px;
  border-left: 1px solid ${({ theme }) => theme.color.line};

  > span {
    display: flex;
    flex-direction: column;
  }
  strong {
    font-size: 12px;
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
`;

const Content = styled.main`
  flex: 1;
  width: 100%;
  max-width: 1440px;
  padding: 24px 32px 48px;

  @media (max-width: 900px) {
    padding: 20px 16px 40px;
  }
`;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function ConsoleShell({
  name,
  image,
  counts,
  children,
}: {
  name: string;
  image?: string;
  counts: { drivers: number; disputes: number };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const main: NavItem[] = [
    { href: "/admin", label: "Overview", icon: Grid },
    { href: "/admin/trips", label: "Trips", icon: RouteTrip },
    { href: "/admin/drivers", label: "Drivers", icon: SealCheck, count: counts.drivers },
    { href: "/admin/payments", label: "Payments", icon: Wallet },
    { href: "/admin/pricing", label: "Pricing", icon: Tag },
    { href: "/admin/disputes", label: "Disputes", icon: Shield, count: counts.disputes },
    { href: "/admin/events", label: "Events", icon: Ticket },
    { href: "/admin/users", label: "Users", icon: Users },
  ];
  const more: NavItem[] = [
    { href: "/admin/refunds", label: "Refunds", icon: ArrowUUpLeft },
    { href: "/admin/support", label: "Support", icon: Lifebuoy },
    { href: "/admin/promotions", label: "Promotions", icon: SealPercent },
    { href: "/admin/faq", label: "Help centre", icon: QuestionCircle },
  ];

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const renderItem = ({ href, label, icon: Icon, count }: NavItem) => {
    const on = isActive(pathname, href);
    return (
      <NavLink key={href} href={href} $on={on} aria-current={on ? "page" : undefined}>
        <Icon size={20} />
        <span>{label}</span>
        {count ? <b>{count}</b> : null}
      </NavLink>
    );
  };

  const prod = process.env.NODE_ENV === "production";

  return (
    <Frame>
      <Side>
        <BrandRow href="/admin" aria-label="Kipita admin home">
          <Mark>
            <i />
            <i />
            <i />
          </Mark>
          <span>kipita</span>
          <b>Admin</b>
        </BrandRow>
        <Nav aria-label="Admin">
          {main.map(renderItem)}
          <small>More</small>
          {more.map(renderItem)}
        </Nav>
        <SideFoot>
          <button type="button" onClick={signOut}>
            <SignOut size={20} />
            Sign out
          </button>
        </SideFoot>
      </Side>
      <Workspace>
        <Top>
          <GlobalSearch action="/admin/users" role="search">
            <MagnifyingGlass size={20} />
            <input name="q" placeholder="Search users by name, phone or email" aria-label="Search users" />
          </GlobalSearch>
          <TopActions>
            <Env $prod={prod}>
              <i />
              {prod ? "Production" : "Development"}
            </Env>
            <Bellish href="/admin/disputes" aria-label={`${counts.disputes} open cases`}>
              <Bell size={20} />
              {counts.disputes > 0 && <b>{counts.disputes}</b>}
            </Bellish>
            <Profile>
              <Avatar name={name || "Admin"} src={image} size={34} />
              <span>
                <strong>{name}</strong>
                <small>Admin</small>
              </span>
              <CaretRight size={16} />
            </Profile>
          </TopActions>
        </Top>
        <Content>{children}</Content>
      </Workspace>
    </Frame>
  );
}
