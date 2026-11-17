"use client";

import styled, { css, keyframes } from "styled-components";
import { nocturne, pulse } from "@/lib/nocturne";

export const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

export const fs = {
  small: "13px",
  meta: "15px",
  body: "17px",
  route: "22px",
  head: "clamp(26px, 3vw, 32px)",
} as const;

const roll = keyframes`
  to { background-position: 24px 0; }
`;

export const SectionHead = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 6px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: ${fs.head};
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: ${nocturne.cream};
`;

export const SectionLead = styled.p`
  margin: 0 0 18px;
  max-width: 60ch;
  font-size: ${fs.body};
  line-height: 1.5;
  color: ${nocturne.muted};
`;

export const Count = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 9px;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: ${fs.meta};
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`;

export type Mood = "running" | "plain";

export const Row = styled.article<{ $mood: Mood }>`
  --row-ink: ${({ $mood }) => ($mood === "running" ? nocturne.onGreen : nocturne.cream)};
  --row-soft: ${({ $mood }) => ($mood === "running" ? nocturne.onGreenMuted : nocturne.muted)};
  --row-mark: ${({ $mood }) => ($mood === "running" ? nocturne.lime : nocturne.accent)};
  ${({ $mood }) =>
    $mood === "running" &&
    css`
      --act-ink: ${nocturne.onGreen};
      --act-line: ${nocturne.onGreenMuted};
      --act-soft: ${nocturne.onGreenMuted};
      --act-main: ${nocturne.ctaBg};
      --act-main-ink: ${nocturne.ctaFg};
      --act-main-hover: ${nocturne.ctaBg};
    `}

  display: grid;
  grid-template-columns: 148px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px 36px;
  padding: clamp(20px, 3vh, 28px) ${({ $mood }) => ($mood === "running" ? "clamp(18px, 2.4vw, 28px)" : "0")};
  color: var(--row-ink);
  border-radius: ${({ $mood }) => ($mood === "running" ? "16px" : "0")};
  background: ${({ $mood }) => ($mood === "running" ? nocturne.green : "transparent")};

  & + & {
    border-top: 1.5px solid ${({ $mood }) => ($mood === "running" ? "transparent" : RULE)};
  }

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
`;

export const Depart = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;

  > span {
    font-size: ${fs.meta};
    font-weight: 600;
    color: var(--row-soft);
  }
  > b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: ${fs.route};
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--row-ink);
  }
  > :last-child:not(b):not(span) {
    margin-top: 8px;
  }

  @media (max-width: 860px) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;

    > :last-child:not(b):not(span) {
      margin-top: 0;
    }
  }
`;

export const Road = styled.p<{ $moving?: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: ${fs.route};
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: var(--row-ink);

  > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  > i {
    position: relative;
    flex: 1 1 40px;
    min-width: 28px;
    max-width: 160px;
    height: 3px;
    background-image: linear-gradient(90deg, var(--row-mark) 0 12px, transparent 12px 24px);
    background-size: 24px 3px;
    ${({ $moving }) =>
      $moving &&
      css`
        animation: ${roll} 0.9s linear infinite;
      `}
  }
  > i::before,
  > i::after {
    content: "";
    position: absolute;
    top: -3.5px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--row-mark);
  }
  > i::before {
    left: -5px;
  }
  > i::after {
    right: -5px;
    ${({ $moving }) =>
      $moving &&
      css`
        box-shadow: 0 0 0 4px color-mix(in oklab, var(--row-mark) 30%, transparent);
      `}
  }

  @media (prefers-reduced-motion: reduce) {
    > i {
      animation: none;
    }
  }
`;

export type TagTone = "go" | "wait" | "pay" | "live" | "done" | "off";

const tagLook: Record<TagTone, ReturnType<typeof css>> = {
  go: css`
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  `,
  wait: css`
    background: ${nocturne.sage};
    color: ${nocturne.greenDeep};
  `,
  pay: css`
    background: color-mix(in oklab, ${nocturne.ctaBg} 16%, transparent);
    color: ${nocturne.cream};
    box-shadow: inset 0 0 0 1.5px ${nocturne.ctaBg};
  `,
  live: css`
    background: color-mix(in oklab, ${nocturne.lime} 22%, transparent);
    color: ${nocturne.lime};
  `,
  done: css`
    background: ${nocturne.surface3};
    color: ${nocturne.muted};
  `,
  off: css`
    background: transparent;
    color: ${nocturne.muted};
    box-shadow: inset 0 0 0 1.5px ${RULE};
  `,
};

export const Tag = styled.span<{ $tone: TagTone }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  font-size: ${fs.small};
  font-weight: 800;
  white-space: nowrap;
  ${({ $tone }) => tagLook[$tone]}

  > i {
    position: relative;
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }
  > i[data-pulse]::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: currentColor;
    animation: ${pulse} 1.8s ease-in-out infinite;
  }
  > svg {
    flex: none;
  }

  @media (prefers-reduced-motion: reduce) {
    > i[data-pulse]::after {
      animation: none;
      opacity: 0.3;
    }
  }
`;

export const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  margin-top: 10px;
  font-size: ${fs.meta};
  color: var(--row-soft);

  b {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--row-ink);
  }
  > span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
`;

export const Acts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;

  @media (max-width: 860px) {
    justify-content: stretch;
    width: 100%;
    > * {
      flex: 1;
    }
  }
`;

export const Act = styled.button<{ $primary?: boolean; $quiet?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 ${({ $quiet }) => ($quiet ? "10px" : "20px")};
  border: 1.5px solid
    ${({ $primary, $quiet }) => ($primary || $quiet ? "transparent" : `var(--act-line, ${RULE})`)};
  border-radius: 999px;
  background: ${({ $primary }) => ($primary ? `var(--act-main, ${nocturne.green})` : "transparent")};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: ${fs.meta};
  font-weight: 800;
  color: ${({ $primary, $quiet }) =>
    $primary
      ? `var(--act-main-ink, ${nocturne.onGreen})`
      : $quiet
        ? `var(--act-soft, ${nocturne.muted})`
        : `var(--act-ink, ${nocturne.cream})`};
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    transform 0.16s cubic-bezier(0.16, 1, 0.3, 1);

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ $primary }) =>
        $primary ? `var(--act-main-hover, ${nocturne.greenDeep})` : nocturne.surface2};
      color: ${({ $primary }) =>
        $primary ? `var(--act-main-ink, ${nocturne.onGreen})` : nocturne.accent};
      border-color: ${({ $primary, $quiet }) =>
        $primary || $quiet ? "transparent" : nocturne.accent};
      transform: translateY(-1px);
    }
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }

  @media (max-width: 860px) {
    ${({ $quiet }) =>
      $quiet &&
      css`
        order: 3;
        flex: 1 0 100%;
      `}
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled) {
      transform: none;
    }
  }
`;

export const RowError = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  font-size: ${fs.meta};
  font-weight: 600;
  color: ${nocturne.danger};
`;
