"use client";

import styled from "styled-components";

const Svg = styled.svg`
  display: block;
  width: 100%;
  max-width: 190px;
  height: auto;
`;

export function LedgerArt() {
  return (
    <Svg viewBox="0 0 190 96" fill="none" aria-hidden>
      {[0, 1, 2].map((i) => {
        const y = 6 + i * 30;
        const lead = i === 0;
        return (
          <g key={y}>
            <rect
              x="4"
              y={y}
              width="182"
              height="26"
              rx="9"
              stroke="currentColor"
              strokeWidth="2"
              strokeOpacity={lead ? 0.5 : 0.22}
            />
            <circle
              cx="21"
              cy={y + 13}
              r="7"
              fill="currentColor"
              fillOpacity={lead ? 0.42 : 0.18}
            />
            <rect
              x="36"
              y={y + 7}
              width={lead ? 62 : 48}
              height="5"
              rx="2.5"
              fill="currentColor"
              fillOpacity={lead ? 0.42 : 0.18}
            />
            <rect
              x="36"
              y={y + 16}
              width={lead ? 38 : 30}
              height="4"
              rx="2"
              fill="currentColor"
              fillOpacity={lead ? 0.24 : 0.12}
            />
            <rect
              x="142"
              y={y + 9}
              width="40"
              height="8"
              rx="4"
              fill="currentColor"
              fillOpacity={lead ? 0.42 : 0.16}
            />
          </g>
        );
      })}
    </Svg>
  );
}
