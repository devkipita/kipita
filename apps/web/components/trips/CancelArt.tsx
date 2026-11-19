"use client";

import styled, { keyframes } from "styled-components";
import { dash, nocturne } from "@/lib/nocturne";

const typing = keyframes`
  0%, 60%, 100% { opacity: 0.35; }
  30% { opacity: 1; }
`;

const Svg = styled.svg`
  display: block;
  width: 100%;
  max-width: 300px;
  height: auto;

  .ink {
    stroke: ${nocturne.cream};
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .ink-fill {
    fill: ${nocturne.cream};
  }
  .tint {
    fill: ${nocturne.accent};
    fill-opacity: 0.15;
  }
  .ground {
    fill: ${nocturne.cream};
    fill-opacity: 0.07;
  }
  .cta-fill {
    fill: ${nocturne.ctaBg};
  }
  .flow {
    animation: ${dash} 1.6s linear infinite;
  }
  .dot {
    animation: ${typing} 1.4s ease-in-out infinite;
  }
  .dot:nth-of-type(2) {
    animation-delay: 0.18s;
  }
  .dot:nth-of-type(3) {
    animation-delay: 0.36s;
  }

  @media (prefers-reduced-motion: reduce) {
    .flow,
    .dot {
      animation: none;
    }
  }
`;

export function ChatHelloArt() {
  return (
    <Svg viewBox="0 0 240 150" fill="none" aria-hidden="true" focusable="false">
      <path
        className="cta-fill ink"
        strokeWidth="3"
        d="M53 23h48c12 0 20 8 20 20v22c0 12-8 20-20 20H70l-17 11 3-11h-3c-12 0-20-8-20-20V43c0-12 8-20 20-20Z"
      />
      <path
        className="ink"
        strokeWidth="2.5"
        d="m67 60-8-11c-3-4 1-7 4-4l8 9-8-16c-2-4 3-6 5-2l8 15-5-17c-1-4 4-5 6-1l5 16-1-12c0-4 5-4 6 0l2 19 4-5c3-4 7-1 5 3l-6 13c-4 9-15 11-22 4l-7-7c-4-4 0-8 4-4Z"
      />
      <path className="ink" strokeWidth="2.5" d="M84 57c-5 1-7 5-5 9M52 39l-3-4m50 2 3-4m2 13 5-1" />
      <path
        className="tint ink"
        strokeWidth="3"
        d="M151 32h32c10 0 16 6 16 16v9c0 10-6 16-16 16h-3l4 10-15-10h-18c-10 0-16-6-16-16v-9c0-10 6-16 16-16Z"
      />
      <g>
        <circle className="ink-fill dot" cx="153" cy="52" r="3" />
        <circle className="ink-fill dot" cx="167" cy="52" r="3" />
        <circle className="ink-fill dot" cx="181" cy="52" r="3" />
      </g>
      <path className="ground" d="M183 137c21.5 0 39-2.2 39-5s-17.5-5-39-5-39 2.2-39 5 17.5 5 39 5Z" />
      <path
        className="tint ink"
        strokeWidth="3"
        d="M149 119v-11c0-5 3-8 8-9l7-11c3-4 7-6 14-6h9c7 0 11 4 15 12l3 6h4c7 0 11 5 11 12v7c0 3-3 5-7 5h-57c-4 0-7-2-7-5Z"
      />
      <path className="ink" strokeWidth="2.5" d="M179 89v11m-1 7h4m-21-7 6-9c2-3 5-3 10-3h8c6 0 8 3 12 12h-36Z" />
      <circle className="ink-fill ink" strokeWidth="2.5" cx="163" cy="123" r="7" />
      <circle className="tint" cx="163" cy="123" r="2.5" />
      <circle className="ink-fill ink" strokeWidth="2.5" cx="205" cy="123" r="7" />
      <circle className="tint" cx="205" cy="123" r="2.5" />
      <path className="ink" strokeWidth="3" d="M202 106v3m11-3v3" />
      <path className="ink" strokeWidth="2" d="M205 113c2 2.7 4 2.7 6 0" />
      <path className="ink" strokeWidth="2.5" d="M150 109h4" />
    </Svg>
  );
}

export function TurnBackArt() {
  return (
    <Svg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <path className="ground" d="M133 153c55.8 0 101-3.1 101-7s-45.2-7-101-7-101 3.1-101 7 45.2 7 101 7Z" />
      <path className="ink" strokeWidth="2.6" d="M266 82v56" />
      <path className="cta-fill ink" strokeWidth="2.6" d="M266 81a24 24 0 1 0 0-48 24 24 0 0 0 0 48Z" />
      <path className="ink" strokeWidth="3.4" d="M276 69V52c0-12-19-12-19 0v13m-7-6 7 7 7-7" />
      <path
        className="tint ink"
        strokeWidth="2.6"
        d="m57 96 13-3 10-18c5-9 14-13 27-13h29c13 0 21 6 29 16l12 15 24 3c14 2 23 9 23 20v5c0 6-5 9-13 9H55c-10 0-15-5-15-13v-7c0-7 6-12 17-14Z"
      />
      <path className="tint ink" strokeWidth="2.6" d="M107 71h-5c-8 0-12 4-16 11l-6 11h33V71h-6Z" />
      <path className="tint ink" strokeWidth="2.6" d="M123 71h12c9 0 14 4 20 11l9 11h-41V71Z" />
      <path className="ink" strokeWidth="2.6" d="M124 103h10M43 108h6" />
      <circle className="ink-fill ink" strokeWidth="2.6" cx="75" cy="130" r="16" />
      <circle className="tint" cx="75" cy="130" r="8" />
      <circle className="ink-fill ink" strokeWidth="2.6" cx="184" cy="130" r="16" />
      <circle className="tint" cx="184" cy="130" r="8" />
      <path className="ink" strokeWidth="2.6" d="M195 105c2.7 2.7 5.3 2.7 8 0m8 1c2.7 2.7 5.3 2.7 8 0m-15 10c2.7 2.7 5.7 2.7 9 0" />
    </Svg>
  );
}

export function RefundBackArt() {
  return (
    <Svg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <path className="ground" d="M161 158c48.6 0 88-3.1 88-7s-39.4-7-88-7-88 3.1-88 7 39.4 7 88 7Z" />
      <path className="ink flow" strokeWidth="3.5" strokeDasharray="6 7" d="M230 76c13-28-12-47-43-47-32 0-57 9-75 28" />
      <path className="ink" strokeWidth="3.5" d="m113 43-3 16 16-1" />
      <circle className="ink-fill ink" strokeWidth="3" cx="127" cy="140.2" r="11" />
      <circle className="tint" cx="127" cy="140.2" r="4" />
      <circle className="ink-fill ink" strokeWidth="3" cx="203.7" cy="133.5" r="11" />
      <circle className="tint" cx="203.7" cy="133.5" r="4" />
      <path
        className="tint ink"
        strokeWidth="3.5"
        d="M95.5 136c-6.3-2.5-8.3-14.4-2.9-21.9 5.3-7.5 15.3-8.4 22.1-11l11.4-19c5.3-8.5 16-11.5 32-12.9 18.9-1.6 29.4 3.5 40.8 18.5l6.7 8.5c14.1.8 25.9 8.8 26.7 18.7.8 9-5.8 14.6-16.7 15.5-2.4-15.8-23.3-14-23.9 2.1l-52.8 4.6c-2.4-15.8-23.3-14-23.9 2.1l-7 .6c-6 .5-10.1-1.1-12.5-5.9Z"
      />
      <path className="tint ink" strokeWidth="3" d="m125.7 103.2 10.6-17c3.6-4.3 11.6-5 19.6-5.7l1.8 20.9-32 1.8Z" />
      <path className="tint ink" strokeWidth="3" d="M164.8 79.7c12-.1 18.5 5.4 27.8 18.7l-25.9 2.2-1.9-20.9Z" />
      <path className="ink" strokeWidth="2.5" d="m162.3 108 1.7 19 16.9-1.5m-8.5-16.4 6-.5" />
      <path className="ink" strokeWidth="3" d="m221.4 106.9 4.3 2.6M95.9 117.9c3 3.1 5.6 2.8 8-.7m8.9-1.8c2.9 3.1 5.6 2.9 7.9-.7" />
      <path className="ink" strokeWidth="2.5" d="M102.7 126.3c4.3 3.6 8.6 2.9 12.8-2.1" />
      <path className="ink" strokeWidth="2" d="m83 75 5-4m-3 13 6-1" />
      <circle className="cta-fill ink" strokeWidth="3" cx="69" cy="87" r="10" />
      <path className="ink" strokeWidth="2" d="M71 82c-4-.7-6 1-6 5 0 3.3 1.7 5 5 5" />
      <path className="tint ink" strokeWidth="3" d="M41 115v-5c0-2 1.3-3.3 4-4l21-4v13H41Z" />
      <path className="tint ink" strokeWidth="3" d="M45 112h25c2.7 0 4 1.3 4 4v20c0 2.7-1.3 4-4 4H45c-3.3 0-5-1.7-5-5v-18c0-3.3 1.7-5 5-5Z" />
      <path className="tint ink" strokeWidth="2.5" d="M66 121h10v11H66c-3.3 0-5-1.7-5-5 0-4 1.7-6 5-6Z" />
      <circle className="ink-fill" cx="67" cy="126.5" r="1.6" />
    </Svg>
  );
}
