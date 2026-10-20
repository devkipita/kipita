"use client";

import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";

export const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

export const EditorRule = styled.div`
  height: 1.5px;
  margin: 30px 0 22px;
  background: ${RULE};
`;

export const EditorLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0;
    color: ${nocturne.cream};
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .tools button {
    font-size: 15px;
    white-space: nowrap;
  }

  @media (max-width: 560px) {
    gap: 10px;

    h2 {
      font-size: 16px;
      white-space: nowrap;
    }
    .tools {
      gap: 4px;
    }
    .tools button {
      font-size: 14px;
    }
  }
`;

export const Choice = styled.button<{ $on?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 5px 12px;
  line-height: 1.1;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.accent : RULE)};
  border-radius: 8px;
  background: ${({ $on }) => ($on ? nocturne.accent : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.12s ease,
    box-shadow 0.16s ease;

  small {
    align-self: center;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: 0;
    color: ${({ $on }) => ($on ? nocturne.onGreenMuted : nocturne.muted)};
    transition: color 0.16s ease;
  }

  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.accent};
      background: ${({ $on }) => ($on ? nocturne.green : nocturne.sage)};
      color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.greenDeep)};
      box-shadow: none;
    }
    &:hover small {
      color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.greenDeep)};
    }
  }

  &:active {
    background: ${({ $on }) => ($on ? nocturne.greenDeep : nocturne.accent)};
    color: ${nocturne.onGreen};
    border-color: ${nocturne.accent};
    box-shadow: none;
  }
  &:active small {
    color: ${nocturne.onGreenMuted};
  }

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
    border-color: ${nocturne.accent};
  }

`;

export const Choices = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Row = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 16px 22px;
  flex-wrap: wrap;
  margin-top: 30px;

  > *:first-child {
    flex: 0 1 var(--row-field, 220px);
    min-width: 0;
  }
`;

export function LongArrow({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.62}
      viewBox="0 0 29 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path className="shaft" d="M1.4 9h15" />
      <path className="head" d="M14.6 1.4 27.2 9l-12.6 7.6" />
    </svg>
  );
}

export function Cross({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2.4 2.4 21.6 21.6M21.6 2.4 2.4 21.6" />
    </svg>
  );
}

export const BareInput = styled.input`
  width: 100%;
  padding: 8px 0;
  border: none;
  border-bottom: 2px solid ${RULE};
  background: transparent;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 23px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${nocturne.cream};
  caret-color: ${nocturne.accent};

  transition:
    border-color 0.16s ease,
    border-width 0.12s ease,
    background-color 0.16s ease;

  &::placeholder {
    color: ${nocturne.muted2};
    font-weight: 500;
    transition: color 0.16s ease;
  }
  @media (hover: hover) {
    &:hover {
      border-bottom-color: ${nocturne.accent};
    }
    &:hover::placeholder {
      color: ${nocturne.muted};
    }
  }
  &:focus,
  &:focus-visible {
    outline: none;
    border-bottom-width: 3px;
    border-bottom-color: ${nocturne.accent};
    background: ${nocturne.surface2};
  }
  &:focus::placeholder {
    color: ${nocturne.muted3};
  }
`;

export const BareField = styled.label`
  display: block;

  span {
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
`;

export const TextAction = styled.button`
  min-height: 46px;
  padding: 6px 0;
  border: none;
  background: transparent;
  color: ${nocturne.cream};
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: inset 0 -2px 0 ${RULE};
  transition:
    box-shadow 0.16s ease,
    color 0.16s ease;

  @media (hover: hover) {
    &:hover {
      box-shadow: inset 0 -3px 0 ${nocturne.accent};
      color: ${nocturne.green};
    }
  }
  &:active {
    box-shadow: inset 0 -2px 0 ${nocturne.greenDeep};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

export const CommitAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  margin-top: 22px;
  padding: 0 22px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition:
    filter 0.16s ease,
    transform 0.12s ease,
    gap 0.16s ease;

  svg {
    color: inherit;
    overflow: visible;
  }
  svg .shaft {
    transform-origin: 0% 50%;
    transition: transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  svg .head {
    transition: transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  @media (hover: hover) {
    &:hover {
      filter: brightness(1.14);
      transform: translateY(-1px);
    }
    &:hover svg .shaft {
      transform: scaleX(1.3);
    }
    &:hover svg .head {
      transform: translateX(4px);
    }
  }
  &:active {
    transform: translateY(1px);
    filter: brightness(0.96);
  }
  &:active svg .head {
    transform: translateX(8px);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:hover,
    &:active {
      transform: none;
    }
    &:hover svg {
      transform: none;
    }
  }

  @media (max-width: 640px) {
    width: 100%;
    justify-content: center;
  }
`;
