"use client";

import styled, { css, keyframes } from "styled-components";

const pulse = keyframes`
  0%   { opacity: 0.5; }
  50%  { opacity: 0.85; }
  100% { opacity: 0.5; }
`;

const animated = css`
  animation: ${pulse} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Shimmer = styled.div<{
  $w?: string;
  $h?: string;
  $r?: string;
  $mb?: string;
}>`
  width: ${({ $w }) => $w ?? "100%"};
  height: ${({ $h }) => $h ?? "14px"};
  margin-bottom: ${({ $mb }) => $mb ?? "0"};
  border-radius: ${({ $r }) => $r ?? "8px"};
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  ${animated}
`;

export const SkeletonCard = styled.div<{ $h?: string }>`
  height: ${({ $h }) => $h ?? "132px"};
  border-radius: 18px;
  border: 1px solid ${({ theme }) => theme.color.outlineVariant};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  ${animated}
`;

export const SkeletonStack = styled.div<{ $gap?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? "14px"};
`;

export const Busy = styled.div.attrs({
  role: "status",
  "aria-busy": "true",
  "aria-live": "polite",
})``;

export const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
