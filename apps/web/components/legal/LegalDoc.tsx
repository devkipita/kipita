"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import { nocturne } from "@/lib/nocturne";
import { dur, ease } from "@/lib/motion";
import { LEGAL_EFFECTIVE, LEGAL_TABS, type LegalSectionLink } from "@/lib/legal";
import { FileText, ArrowRight } from "@/components/icons";

const Page = styled(ContentWidth)`
  display: grid;
  grid-template-columns: 252px minmax(0, 1fr);
  gap: 0;
  align-items: start;
  padding-bottom: 96px;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: 56px;
  }
`;

const Rail = styled.aside`
  position: sticky;
  top: calc(var(--topbar-h) + 118px);
  padding: 40px 28px 40px 0;
  border-right: 1px solid ${nocturne.line2};
  max-height: calc(100dvh - var(--topbar-h) - 140px);
  overflow-y: auto;
  scrollbar-width: thin;

  @media (max-width: 960px) {
    display: none;
  }

  @media print {
    display: none;
  }
`;

const RailList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
`;

const RailLink = styled.a<{ $on: boolean }>`
  display: block;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.35;
  font-weight: ${({ $on }) => ($on ? 700 : 500)};
  color: ${({ $on }) => ($on ? nocturne.accent : nocturne.muted2)};
  background: ${({ $on }) => ($on ? nocturne.surface2 : "transparent")};
  transition:
    color ${dur.short4}ms ${ease.standard},
    background ${dur.short4}ms ${ease.standard};

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.cream};
      background: ${nocturne.surface2};
    }
  }

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const RailGroup = styled.p`
  margin: 26px 0 8px;
  padding: 18px 12px 0;
  border-top: 1px solid ${nocturne.line2};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${nocturne.muted3};
`;

const Article = styled.article`
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 0 0 clamp(24px, 5vw, 72px);

  h1 {
    font-size: clamp(2rem, 4.4vw, 2.9rem);
    font-weight: 400;
    line-height: 1.18;
    letter-spacing: -0.03em;
    margin: 0 0 20px;
    color: ${nocturne.cream};
  }

  h2 {
    font-size: clamp(1.35rem, 2.6vw, 1.65rem);
    font-weight: 500;
    letter-spacing: -0.02em;
    margin: 0 0 14px;
    color: ${nocturne.cream};
    scroll-margin-top: calc(var(--topbar-h) + 132px);
  }

  h3 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 26px 0 8px;
    color: ${nocturne.cream};
  }

  p,
  li {
    color: ${nocturne.muted};
    font-size: 1rem;
    line-height: 1.75;
  }

  p {
    margin: 0 0 16px;
  }

  ul,
  ol {
    margin: 0 0 18px;
    padding-left: 22px;
    display: grid;
    gap: 8px;
  }

  strong {
    color: ${nocturne.cream};
    font-weight: 600;
  }

  a {
    color: ${nocturne.accent};
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  @media (max-width: 960px) {
    padding: 28px 0 0;
    max-width: none;
  }
`;

const Eyebrow = styled.p`
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${nocturne.muted3};
`;

const Hero = styled.div`
  display: flex;
  justify-content: center;
  padding: 8px 0 44px;

  svg {
    width: min(100%, 420px);
    height: auto;
  }

  @media (max-width: 960px) {
    padding: 0 0 28px;

    svg {
      width: min(100%, 320px);
    }
  }
`;

const Meta = styled.footer`
  margin-top: 56px;
  padding-top: 20px;
  border-top: 1px solid ${nocturne.line2};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  font-size: 14px;
  color: ${nocturne.muted3};
`;

const MetaAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: ${nocturne.accent};
  cursor: pointer;

  @media (hover: hover) {
    &:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  }

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
    border-radius: 6px;
  }

  @media print {
    display: none;
  }
`;

const NextDoc = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 36px;
  padding: 14px 20px;
  border: 1px solid ${nocturne.line};
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  color: ${nocturne.cream};
  text-decoration: none;
  transition: background ${dur.short4}ms ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }

  @media print {
    display: none;
  }
`;

export function LegalDoc({
  eyebrow,
  sections,
  art,
  children,
}: {
  eyebrow: string;
  sections: readonly LegalSectionLink[];
  art?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const active = useActiveSection(sections);
  const index = LEGAL_TABS.findIndex((tab) => tab.href === pathname);
  const next = index >= 0 ? LEGAL_TABS[(index + 1) % LEGAL_TABS.length] : null;

  return (
    <Page>
      <Rail aria-label="On this page">
        <RailList>
          {sections.map((section) => (
            <li key={section.id}>
              <RailLink
                href={`#${section.id}`}
                $on={active === section.id}
                aria-current={active === section.id ? "true" : undefined}
              >
                {section.label}
              </RailLink>
            </li>
          ))}
        </RailList>
        <RailGroup>Other policies</RailGroup>
        <RailList>
          {LEGAL_TABS.filter((tab) => tab.href !== pathname).map((tab) => (
            <li key={tab.href}>
              <RailLink as={Link} href={tab.href} $on={false}>
                {tab.label}
              </RailLink>
            </li>
          ))}
        </RailList>
      </Rail>

      <Article>
        <Eyebrow>{eyebrow}</Eyebrow>
        {art ? <Hero aria-hidden>{art}</Hero> : null}
        {children}
        <Meta>
          <span>Effective {LEGAL_EFFECTIVE}</span>
          <MetaAction type="button" onClick={() => window.print()}>
            <FileText size={16} />
            Print or save as PDF
          </MetaAction>
        </Meta>
        {next ? (
          <NextDoc href={next.href}>
            Next: {next.label}
            <ArrowRight size={16} />
          </NextDoc>
        ) : null}
      </Article>
    </Page>
  );
}

function useActiveSection(sections: readonly LegalSectionLink[]): string {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node != null);
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-26% 0px -62% 0px", threshold: 0 },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [sections]);

  return active;
}
