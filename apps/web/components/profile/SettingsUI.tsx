"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ToneName } from "@/lib/theme";

export const SectionTitle = styled.h2`
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.muted};
  margin: 30px 4px 10px;
`;

export const Panel = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
`;

const rowBase = css`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  text-align: left;
`;

const Lead = styled.span<{ $tone?: ToneName }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  flex: none;
  background: ${({ theme, $tone }) => ($tone ? theme.tone[$tone].bg : theme.color.surface2)};
  color: ${({ theme, $tone }) => ($tone ? theme.tone[$tone].on : theme.color.primary)};
`;

const Body = styled.span`
  flex: 1;
  min-width: 0;
  .t {
    display: block;
    font-weight: 600;
    color: ${({ theme }) => theme.color.text};
  }
  .d {
    display: block;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.color.muted};
    margin-top: 2px;
  }
`;

const Divide = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.color.line};
  margin-left: 72px;
`;

const rowInteractive = css`
  ${rowBase}
  text-decoration: none;
  transition: background 0.15s ease;
  svg.chev {
    color: ${({ theme }) => theme.color.muted};
    flex: none;
  }
  &:hover {
    background: ${({ theme }) => theme.color.surface2};
  }
`;

const RowLink = styled(Link)`
  ${rowInteractive}
`;

const RowAnchor = styled.a`
  ${rowInteractive}
`;

const RowDiv = styled.div`
  ${rowBase}
`;

/** A tappable settings row that navigates somewhere. `external` renders <a>. */
export function LinkRow({
  icon: Icon,
  title,
  description,
  href,
  external,
  last,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  href: string;
  external?: boolean;
  last?: boolean;
  tone?: ToneName;
}) {
  const inner = (
    <>
      <Lead $tone={tone}>
        <Icon size={19} strokeWidth={2.2} />
      </Lead>
      <Body>
        <span className="t">{title}</span>
        {description && <span className="d">{description}</span>}
      </Body>
      <ChevronRight className="chev" size={20} strokeWidth={2.2} />
    </>
  );
  return (
    <>
      {external ? (
        <RowAnchor href={href} target="_blank" rel="noreferrer">
          {inner}
        </RowAnchor>
      ) : (
        <RowLink href={href}>{inner}</RowLink>
      )}
      {!last && <Divide />}
    </>
  );
}

/** A settings row with a control (switch, etc.) on the right. */
export function ControlRow({
  icon: Icon,
  title,
  description,
  children,
  last,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
  tone?: ToneName;
}) {
  return (
    <>
      <RowDiv>
        <Lead $tone={tone}>
          <Icon size={19} strokeWidth={2.2} />
        </Lead>
        <Body>
          <span className="t">{title}</span>
          {description && <span className="d">{description}</span>}
        </Body>
        {children}
      </RowDiv>
      {!last && <Divide />}
    </>
  );
}
