"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import { nocturne } from "@/lib/nocturne";
import { dur, ease } from "@/lib/motion";
import { LEGAL_LINKS } from "@/lib/site";

const Page = styled(ContentWidth)`
  padding-top: 40px;
  padding-bottom: 72px;

  @media (max-width: 640px) {
    padding-top: 24px;
    padding-bottom: 40px;
  }
`;

const Tabs = styled.nav`
  display: flex;
  gap: 6px;
  margin: 0 0 28px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 640px) {
    margin-inline: calc(-1 * max(var(--page-pad), env(safe-area-inset-left)));
    padding-inline: max(var(--page-pad), env(safe-area-inset-left));
    margin-bottom: 22px;
  }
`;

const Tab = styled(Link)<{ $on: boolean }>`
  flex: none;
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  white-space: nowrap;
  font-size: 15px;
  font-weight: ${({ $on }) => ($on ? 700 : 600)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.muted)};
  background: ${({ $on }) => ($on ? nocturne.green : "transparent")};
  transition:
    background ${dur.short4}ms ${ease.standard},
    color ${dur.short4}ms ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${({ $on }) =>
        $on ? nocturne.green : nocturne.surface2};
      color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Prose = styled.article`
  max-width: 68ch;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
  border-radius: 20px;
  padding: clamp(28px, 4vw, 48px);

  h1 {
    font-size: clamp(1.9rem, 5vw, 2.6rem);
    letter-spacing: -0.025em;
    margin: 0 0 8px;
    color: ${nocturne.cream};
  }

  h2 {
    font-size: 1.3rem;
    margin: 34px 0 10px;
    color: ${nocturne.cream};
  }

  p,
  li {
    color: ${nocturne.muted};
    font-size: 1rem;
    line-height: 1.65;
  }

  ul {
    padding-left: 18px;
    display: grid;
    gap: 6px;
  }

  .updated {
    color: ${nocturne.muted2};
    margin-bottom: 30px;
  }

  a {
    color: ${nocturne.accent};
    font-weight: 600;
    text-underline-offset: 3px;
  }

  @media (max-width: 640px) {
    max-width: none;
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;

    h2 {
      font-size: 1.2rem;
      margin: 26px 0 8px;
    }
  }
`;

export function LegalBody({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";

  return (
    <Page>
      <Tabs aria-label="Legal">
        {LEGAL_LINKS.map((link) => (
          <Tab key={link.href} href={link.href} $on={pathname === link.href}>
            {link.label}
          </Tab>
        ))}
      </Tabs>
      <Prose>{children}</Prose>
    </Page>
  );
}
