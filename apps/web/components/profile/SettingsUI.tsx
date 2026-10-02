"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import { CaretRight as ChevronRight } from "@/components/icons";
import type { KipitaIcon as LucideIcon } from "@/components/icons";
import type { ToneName } from "@/lib/theme";

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  margin: ${({ theme }) => theme.space.xxl} ${({ theme }) => theme.space.xs}
    ${({ theme }) => theme.space.sm};
`;

export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

const rowBase = css`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  min-height: 60px;
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  text-align: left;
`;

const Lead = styled.span<{ $tone?: ToneName }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.sm};
  flex: none;
  background: ${({ theme, $tone }) =>
    $tone ? theme.tone[$tone].bg : theme.color.surfaceContainerHighest};
  color: ${({ theme, $tone }) =>
    $tone ? theme.tone[$tone].on : theme.color.onSurfaceVariant};
`;

const Body = styled.span`
  flex: 1;
  min-width: 0;
  .t {
    display: block;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .d {
    display: block;
    font-size: ${({ theme }) => theme.type.label};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    margin-top: 2px;
  }
`;

const rowInteractive = css`
  ${rowBase}
  text-decoration: none;
  transition: background 0.15s ease;
  svg.chev {
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    flex: none;
  }
  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.color.surfaceContainer};
    }
  }
  &:active {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
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
        <Icon size={20} />
      </Lead>
      <Body>
        <span className="t">{title}</span>
        {description && <span className="d">{description}</span>}
      </Body>
      <ChevronRight className="chev" size={20} />
    </>
  );
  return external ? (
    <RowAnchor href={href} target="_blank" rel="noreferrer">
      {inner}
    </RowAnchor>
  ) : (
    <RowLink href={href}>{inner}</RowLink>
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
    <RowDiv>
      <Lead $tone={tone}>
        <Icon size={20} />
      </Lead>
      <Body>
        <span className="t">{title}</span>
        {description && <span className="d">{description}</span>}
      </Body>
      {children}
    </RowDiv>
  );
}

