"use client";

import styled, { keyframes } from "styled-components";
import { dash, dur, ease, nocturne } from "@/lib/nocturne";

const Svg = styled.svg`
  display: block;
  width: 100%;
  max-width: 420px;
  height: auto;
`;

const settle = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`;

const drop = keyframes`
  from { opacity: 0; transform: translateY(-18px); }
  to { opacity: 1; transform: none; }
`;

const land = keyframes`
  from { opacity: 0; transform: scaleX(0.4); }
  to { opacity: 1; transform: none; }
`;

const SearchSvg = styled(Svg)`
  .ground {
    fill: color-mix(in srgb, ${nocturne.cream} 5%, ${nocturne.surface});
  }
  .road {
    stroke: color-mix(in srgb, ${nocturne.cream} 16%, ${nocturne.surface});
    stroke-width: 16;
    stroke-linecap: round;
  }
  .lane {
    stroke: ${nocturne.surface};
    stroke-width: 2;
    stroke-linecap: round;
    stroke-dasharray: 5 7;
  }
  .face {
    fill: ${nocturne.surface};
  }
  .rim {
    stroke: color-mix(in srgb, ${nocturne.cream} 10%, ${nocturne.surface});
    stroke-width: 1.5;
  }
  .plate {
    fill: ${nocturne.greenDeep};
    fill-opacity: 0.1;
  }
  .ink {
    stroke: ${nocturne.cream};
    stroke-width: 2.6;
    stroke-linecap: round;
  }
  .ink-fill {
    fill: ${nocturne.cream};
  }
  .hint {
    fill: ${nocturne.cream};
    fill-opacity: 0.42;
    font-family: inherit;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .caret {
    fill: ${nocturne.accent};
  }
  .mark {
    fill: ${nocturne.ctaBg};
  }
  .mark-shade {
    fill: color-mix(in srgb, ${nocturne.ctaBg} 82%, ${nocturne.greenDeep});
  }
  .trail {
    stroke: ${nocturne.accent};
    stroke-opacity: 0.55;
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-dasharray: 0.5 7.5;
    animation: ${dash} 2.4s linear infinite;
  }
  .shadow {
    fill: ${nocturne.greenDeep};
    fill-opacity: 0.16;
  }

  .settle,
  .drop,
  .land {
    transform-box: fill-box;
    animation-duration: ${dur.max};
    animation-timing-function: ${ease.enter};
    animation-fill-mode: both;
  }
  .settle {
    animation-name: ${settle};
  }
  .drop {
    animation-name: ${drop};
    animation-delay: 160ms;
  }
  .land {
    transform-origin: center;
    animation-name: ${land};
    animation-delay: 160ms;
  }

  @media (prefers-reduced-motion: reduce) {
    .trail,
    .settle,
    .drop,
    .land {
      animation: none;
    }
  }
`;

export function NoRidesArt() {
  const road = "M30 150C80 150 98 122 150 126S230 146 266 130";
  return (
    <SearchSvg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <path
        className="ground"
        d="M12 148C12 126 58 108 118 106C178 104 222 96 270 102C300 106 312 124 308 140C304 160 272 170 160 170C58 170 12 166 12 148Z"
      />
      <path className="road" d={road} />
      <path className="lane" d={road} />
      <circle className="face ink" cx="30" cy="150" r="9" strokeWidth="2.4" />
      <circle className="ink-fill" cx="30" cy="150" r="3.4" />

      <path className="trail" d="M214 56C234 52 246 62 250 76" />

      <ellipse className="shadow land" cx="266" cy="130" rx="12" ry="3.4" />
      <g className="drop">
        <path className="mark" d="M266 128S247 107 247 92a19 19 0 0 1 38 0c0 15-19 36-19 36Z" />
        <path className="mark-shade" d="M266 128s19-21 19-36a19 19 0 0 0-19-19v55Z" />
        <circle className="face" cx="266" cy="92" r="7.5" />
      </g>

      <g transform="rotate(-3 131 62)">
        <g className="settle">
          <rect className="plate" x="59" y="39" width="150" height="56" rx="28" />
          <rect className="face" x="56" y="34" width="150" height="56" rx="28" />
          <rect className="rim" x="56.75" y="34.75" width="148.5" height="54.5" rx="27.25" />
          <circle className="ink" cx="83" cy="60" r="8" />
          <path className="ink" d="M89 66l5.5 5.5" />
          <rect className="caret" x="105" y="50" width="2.4" height="22" rx="1.2" />
          <text className="hint" x="113" y="66.5">
            Where to?
          </text>
        </g>
      </g>
    </SearchSvg>
  );
}

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
