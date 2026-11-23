import styled, { css, keyframes } from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

export const HelpPanel = styled.div`
  display: grid;

  > * + * {
    box-shadow: inset 0 1px 0 ${nocturne.line};
  }
`;

export const rowPress = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 12px 8px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  line-height: 20px;
  text-align: left;
  text-decoration: none;
  color: ${nocturne.cream};
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  .caret {
    display: grid;
    flex: none;
    place-items: center;
    width: 24px;
    height: 24px;
    color: ${nocturne.cream};
    transition: transform ${dur.state} ${ease.standard};
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: ${({ theme }) => theme.color.surfaceContainerLow};
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
    .caret {
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
