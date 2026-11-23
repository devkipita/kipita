"use client";

import styled, { css, keyframes } from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

export const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

export const fs = {
  small: "13px",
  meta: "14px",
  body: "16px",
  route: "20px",
  head: "20px",
} as const;

const roll = keyframes`
  to { background-position: 24px 0; }
`;

export const SectionHead = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: ${fs.head};
  font-weight: 800;
  line-height: 28px;
  letter-spacing: -0.02em;
  color: ${nocturne.cream};

  @media (max-width: 600px) {
    margin-bottom: 8px;
    font-size: 17px;
    line-height: 24px;
  }
`;

export const SectionLead = styled.p`
  margin: 0 0 16px;
  max-width: 60ch;
  font-size: ${fs.body};
  line-height: 24px;
  color: ${nocturne.muted};
`;

export const Count = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ theme }) => theme.color.secondaryContainer};
  color: ${({ theme }) => theme.color.onSecondaryContainer};
  font-family: var(--font-dm), sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
`;

export type Mood = "running" | "plain";

export const Row = styled.article<{ $mood: Mood }>`
  --row-ink: ${({ $mood }) => ($mood === "running" ? nocturne.onGreen : nocturne.cream)};
  --row-soft: ${({ $mood }) => ($mood === "running" ? nocturne.onGreenMuted : nocturne.muted)};
  --row-mark: ${({ $mood }) => ($mood === "running" ? nocturne.lime : nocturne.accent)};
  --row-track: ${({ $mood, theme }) =>
    $mood === "running" ? "color-mix(in oklab, var(--n-on-green) 20%, transparent)" : theme.color.surfaceContainerHigh};
  ${({ $mood }) =>
    $mood === "running" &&
    css`
      --act-ink: ${nocturne.greenDeep};
      --act-tonal: ${nocturne.lime};
      --act-main: ${nocturne.ctaBg};
      --act-main-ink: ${nocturne.ctaFg};
      --icon-knockout: ${nocturne.green};
    `}

  display: grid;
  grid-template-columns: 136px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px 32px;
  padding: 20px;
  border-radius: 16px;
  color: var(--row-ink);
  background: ${({ $mood, theme }) => ($mood === "running" ? nocturne.green : theme.color.surfaceContainerLowest)};

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    padding: 16px;
  }
`;

export const Depart = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;

  > span {
    font-size: ${fs.small};
    font-weight: 600;
    color: var(--row-soft);
  }
  > b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 28px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--row-ink);
  }
  > :last-child:not(b):not(span) {
    margin-top: 4px;
  }

  @media (max-width: 860px) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;

    > :last-child:not(b):not(span) {
      margin-top: 0;
    }
  }
`;

export const Road = styled.p<{ $moving?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: ${fs.route};
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 28px;
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
    height: 2px;
    background-image: linear-gradient(90deg, var(--row-mark) 0 12px, transparent 12px 24px);
    background-size: 24px 2px;
    ${({ $moving }) =>
      $moving &&
      css`
        animation: ${roll} calc(${dur.max} * 2) linear infinite;
      `}
  }
  > i::before,
  > i::after {
    content: "";
    position: absolute;
    top: -4px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--row-mark);
  }
  > i::before {
    left: -4px;
  }
  > i::after {
    right: -4px;
  }
  > i > svg {
    position: absolute;
    top: 50%;
    left: 50%;
    padding: 0 4px;
    color: var(--row-mark);
    background: var(--road-bg, transparent);
    transform: translate(-50%, -50%);
  }
  .to {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
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
    background: ${({ theme }) => theme.color.successContainer};
    color: ${({ theme }) => theme.color.onSuccessContainer};
  `,
  wait: css`
    background: ${({ theme }) => theme.color.secondaryContainer};
    color: ${({ theme }) => theme.color.onSecondaryContainer};
  `,
  pay: css`
    background: ${({ theme }) => theme.color.warningContainer};
    color: ${({ theme }) => theme.color.onWarningContainer};
  `,
  live: css`
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  `,
  done: css`
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${nocturne.muted};
  `,
  off: css`
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${nocturne.muted};
  `,
};

const ping = keyframes`
  0% { opacity: 0.5; transform: scale(0.5); }
  70%, 100% { opacity: 0; transform: scale(1.5); }
`;

export const Tag = styled.span<{ $tone: TagTone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: ${fs.small};
  font-weight: 600;
  white-space: nowrap;
  ${({ $tone }) => tagLook[$tone]}

  > i {
    position: relative;
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
  > i[data-pulse]::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: currentColor;
    animation: ${ping} calc(${dur.max} * 4) ${ease.enter} infinite;
  }
  > svg {
    flex: none;
  }

  @media (prefers-reduced-motion: reduce) {
    > i[data-pulse]::after {
      animation: none;
      opacity: 0;
    }
  }
`;

export const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 8px;
  font-size: ${fs.meta};
  color: var(--row-soft);

  b {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--row-ink);
  }
  > span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
`;

export const SeatTrack = styled.span<{ $total: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $total }) => $total}, minmax(0, 1fr));
  gap: 2px;
  width: ${({ $total }) => Math.min(160, $total * 16)}px;
  height: 8px;
  overflow: hidden;
  border-radius: 4px;

  i {
    background: var(--row-track);
  }
  i[data-seat="paid"] {
    background: var(--row-mark);
  }
  i[data-seat="taken"] {
    background: color-mix(in oklab, var(--row-mark) 45%, var(--row-track));
  }
`;

export const Acts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;

  @media (max-width: 860px) {
    justify-content: stretch;
    width: 100%;

    > :not([data-menu]) {
      flex: 1;
    }
  }
`;

export const Act = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: ${({ $primary, theme }) =>
    $primary ? `var(--act-main, ${nocturne.green})` : `var(--act-tonal, ${theme.tone.green.bg})`};
  color: ${({ $primary, theme }) =>
    $primary ? `var(--act-main-ink, ${nocturne.onGreen})` : `var(--act-ink, ${theme.tone.green.on})`};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition:
    filter ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (pointer: coarse) {
    min-height: 44px;
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      filter: brightness(0.94);
    }
  }
  &:active:not(:disabled) {
    filter: brightness(0.9);
    transform: scale(0.97);
  }
  &:disabled {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${nocturne.muted2};
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
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
