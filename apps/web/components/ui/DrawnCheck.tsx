"use client";

import styled, { keyframes } from "styled-components";

const draw = keyframes`
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
`;

const Svg = styled.svg`
  display: block;
  flex: none;
  overflow: visible;

  path {
    stroke-dasharray: 24;
    animation: ${draw} 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @media (prefers-reduced-motion: reduce) {
    path {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
`;

export function DrawnCheck({ size = 20 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m4.6 12.6 5 5 9.8-11.2" />
    </Svg>
  );
}
