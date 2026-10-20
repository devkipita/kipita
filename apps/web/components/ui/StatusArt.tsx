"use client";

import styled from "styled-components";

const Svg = styled.svg`
  display: block;
  width: 100%;
  max-width: 420px;
  height: auto;
`;

export function DeadEndArt() {
  return (
    <Svg viewBox="0 0 240 132" fill="none" aria-hidden>
      <path
        d="M10 92h128"
        stroke="currentColor"
        strokeWidth="26"
        strokeLinecap="round"
        strokeOpacity="0.1"
      />
      <path
        d="M24 92h100"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="13 13"
        strokeOpacity="0.35"
      />
      <path
        d="M140 76v32"
        stroke="var(--n-cta-bg)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M140 80h10l-4 6 4 6h-10"
        fill="var(--n-cta-bg)"
        fillOpacity="0.55"
      />

      {[168, 188, 206].map((cx, i) => (
        <circle
          key={cx}
          cx={cx}
          cy="92"
          r="4"
          fill="currentColor"
          fillOpacity={0.26 - i * 0.08}
        />
      ))}

      <g transform="rotate(74 206 78)">
        <path
          d="M206 56a12 12 0 0 1 12 12c0 8.9-12 20.4-12 20.4S194 76.9 194 68a12 12 0 0 1 12-12Zm0 8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4Z"
          fill="currentColor"
          fillOpacity="0.32"
          fillRule="evenodd"
        />
      </g>

      <circle
        cx="30"
        cy="92"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.4"
      />
      <circle cx="30" cy="92" r="4" fill="var(--n-accent)" />
    </Svg>
  );
}

export function BreakArt() {
  return (
    <Svg viewBox="0 0 240 132" fill="none" aria-hidden>
      <path
        d="M10 92h74"
        stroke="currentColor"
        strokeWidth="26"
        strokeLinecap="round"
        strokeOpacity="0.1"
      />
      <path
        d="M156 92h74"
        stroke="currentColor"
        strokeWidth="26"
        strokeLinecap="round"
        strokeOpacity="0.1"
      />
      <path
        d="M24 92h46"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="13 13"
        strokeOpacity="0.35"
      />
      <path
        d="M170 92h46"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="13 13"
        strokeOpacity="0.35"
      />

      <path
        d="M84 78l8 7-8 7 8 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.28"
      />
      <path
        d="M156 78l-8 7 8 7-8 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.28"
      />

      <path
        d="M120 26a7 7 0 0 1 6.1 3.6l24 42A7 7 0 0 1 144 82H96a7 7 0 0 1-6.1-10.4l24-42A7 7 0 0 1 120 26Zm0 16a3.4 3.4 0 0 0-3.4 3.7l.9 13a2.5 2.5 0 0 0 5 0l.9-13A3.4 3.4 0 0 0 120 42Zm0 24.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
        fill="var(--n-cta-bg)"
        fillRule="evenodd"
      />
    </Svg>
  );
}
