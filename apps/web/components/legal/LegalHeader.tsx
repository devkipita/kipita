"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import { nocturne } from "@/lib/nocturne";
import { dur, ease } from "@/lib/motion";
import { LEGAL_TABS } from "@/lib/legal";
import { SITE } from "@/lib/site";

const Band = styled.header`
  border-bottom: 1px solid ${nocturne.line2};
  background: ${nocturne.bg};
  position: sticky;
  top: var(--topbar-h);
  z-index: 5;

  @media print {
    position: static;
    border-bottom: none;
  }
`;

const Inner = styled(ContentWidth)`
  padding-top: 26px;

  @media (max-width: 640px) {
    padding-top: 16px;
  }
`;

const Wordmark = styled.p`
  margin: 0 0 14px;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
  color: ${nocturne.cream};

  span {
    font-weight: 700;
  }

  em {
    font-style: normal;
    font-weight: 400;
    color: ${nocturne.muted};
  }

  @media (max-width: 640px) {
    font-size: 1.15rem;
    margin-bottom: 10px;
  }
`;

const Tabs = styled.nav`
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 860px) {
    margin-inline: calc(-1 * max(var(--page-pad), env(safe-area-inset-left)));
    padding-inline: max(var(--page-pad), env(safe-area-inset-left));
  }

  @media print {
    display: none;
  }
`;

const Tab = styled(Link)<{ $on: boolean }>`
  flex: none;
  display: inline-flex;
  align-items: center;
  min-height: 46px;
  padding: 0 14px;
  white-space: nowrap;
  font-size: 15px;
  font-weight: ${({ $on }) => ($on ? 700 : 500)};
  color: ${({ $on }) => ($on ? nocturne.accent : nocturne.muted)};
  border-bottom: 3px solid
    ${({ $on }) => ($on ? nocturne.accent : "transparent")};
  transition:
    color ${dur.short4}ms ${ease.standard},
    border-color ${dur.short4}ms ${ease.standard};

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.cream};
      border-bottom-color: ${({ $on }) =>
        $on ? nocturne.accent : nocturne.line};
    }
  }

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -3px;
    border-radius: 8px 8px 0 0;
  }
`;

export function LegalHeader() {
  const pathname = usePathname() ?? "";

  return (
    <Band>
      <Inner>
        <Wordmark>
          <span>{SITE.name}</span> <em>Privacy &amp; Terms</em>
        </Wordmark>
        <Tabs aria-label="Privacy and terms">
          {LEGAL_TABS.map((tab) => (
            <Tab
              key={tab.href}
              href={tab.href}
              $on={pathname === tab.href}
              aria-current={pathname === tab.href ? "page" : undefined}
            >
              {tab.label}
            </Tab>
          ))}
        </Tabs>
      </Inner>
    </Band>
  );
}
