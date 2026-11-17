import styled, { css, keyframes } from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

export const HelpPanel = styled.div`
  border-bottom: 1px solid ${nocturne.line2};

  > * {
    border-top: 1px solid ${nocturne.line2};
  }
`;

export const rowLook = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
  min-height: 76px;
  padding: 18px 0;
  border: 0;
  background: transparent;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(18px, 2vw, 22px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
  text-align: left;
  text-decoration: none;
  color: ${nocturne.cream};
  cursor: pointer;

  svg {
    flex: none;
    color: ${nocturne.cream};
    transition: transform ${dur.state} ${ease.standard};
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${nocturne.green};
    }
    &:hover svg {
      color: ${nocturne.green};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 4px;
    border-radius: 6px;
  }
  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`;

const unfold = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: none; }
`;

export const Unfold = styled.div`
  padding: 0 0 24px;
  max-width: 68ch;
  animation: ${unfold} ${dur.enter} ${ease.enter};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
