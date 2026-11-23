import styled, { css, keyframes } from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

export const HelpPanel = styled.div`
  display: grid;
  gap: 4px;
`;

export const rowPress = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px;
  border: 0;
  border-radius: 12px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  text-align: left;
  text-decoration: none;
  color: ${nocturne.cream};
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  svg {
    flex: none;
    color: ${nocturne.muted};
    transition: transform ${dur.state} ${ease.standard};
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: color-mix(in oklab, ${nocturne.cream} 6%, ${({ theme }) => theme.color.surfaceContainerLowest});
    }
  }
  &:active {
    transform: scale(0.98);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
    &:active {
      transform: none;
    }
  }
`;

export const Unfold = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? "1fr" : "0fr")};
  transition: grid-template-rows ${dur.state} ${ease.standard};

  > div {
    min-height: 0;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const FadeIn = styled.div`
  animation: ${fade} ${dur.enter} ${ease.enter};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
