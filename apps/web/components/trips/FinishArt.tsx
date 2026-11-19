"use client";

import styled, { keyframes } from "styled-components";
import { nocturne } from "@/lib/nocturne";

const stepIn = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
`;

const wave = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-18deg); }
  60% { transform: rotate(12deg); }
`;

const burst = keyframes`
  0% { opacity: 0; transform: translate(0, 0) scale(0.4) rotate(0deg); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--x), var(--y)) scale(1) rotate(var(--r)); }
`;

const drop = keyframes`
  from { opacity: 0; transform: translateY(-18px) scale(0.8); }
  to { opacity: 1; transform: none; }
`;

const BITS: [number, number, string, number, number, number][] = [
  [160, 70, "cta", -70, -46, 160],
  [160, 70, "lime", -42, -64, -120],
  [160, 70, "accent", 0, -72, 200],
  [160, 70, "cta", 44, -62, -160],
  [160, 70, "lime", 72, -40, 120],
  [160, 70, "accent", -86, -12, 90],
  [160, 70, "cta", 90, -8, -90],
  [160, 70, "lime", 24, -84, 240],
];

const Svg = styled.svg`
  width: 100%;
  max-width: 340px;
  height: auto;
  overflow: visible;

  .ink { stroke: ${nocturne.cream}; }
  .accent { fill: ${nocturne.green}; }
  .deep { fill: ${nocturne.greenDeep}; }
  .lime { fill: ${nocturne.lime}; }
  .cta { fill: ${nocturne.ctaBg}; }
  .skin { fill: ${nocturne.tan}; }
  .surface { fill: ${nocturne.surface2}; }
  .paper { fill: ${nocturne.surface}; }
  .ground { fill: ${nocturne.cream}; }

  .left,
  .right {
    transform-box: fill-box;
    animation: ${stepIn} 420ms cubic-bezier(0.23, 1, 0.32, 1) both;
  }
  .right { animation-delay: 90ms; }
  .car { animation: ${stepIn} 380ms cubic-bezier(0.23, 1, 0.32, 1) both; }
  .flag { transform-box: fill-box; transform-origin: bottom center; animation: ${drop} 420ms cubic-bezier(0.34, 1.56, 0.64, 1) 220ms both; }

  .arm {
    transform-box: fill-box;
    transform-origin: 10% 90%;
    animation: ${wave} 900ms ease-in-out 520ms 2;
  }

  .bit {
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
    animation: ${burst} 1100ms cubic-bezier(0.23, 1, 0.32, 1) 300ms both;
  }

  ${BITS.map(([, , , dx, dy, r], i) => `.bit-${i} { --x: ${dx}px; --y: ${dy}px; --r: ${r}deg; animation-delay: ${300 + i * 35}ms; }`).join("\n")}

  @media (prefers-reduced-motion: reduce) {
    .left, .right, .car, .flag, .arm { animation: none; }
    .bit { animation: none; opacity: 0; }
  }
`;



export function FinishArt() {
  return (
    <Svg viewBox="0 0 320 190" aria-hidden="true" focusable="false">
      <ellipse className="ground" cx="160" cy="172" rx="148" ry="10" opacity="0.07" />
      <rect className="surface" x="18" y="160" width="284" height="8" rx="4" />

      <g className="car">
        <path className="paper" d="M104 150 v-18 a10 10 0 0 1 10 -10 h14 l14 -18 h40 l16 18 h10 a10 10 0 0 1 10 10 v18 z" />
        <path className="ink" d="M104 150 v-18 a10 10 0 0 1 10 -10 h14 l14 -18 h40 l16 18 h10 a10 10 0 0 1 10 10 v18 z" fill="none" strokeWidth="2.6" strokeLinejoin="round" />
        <path className="ink" d="M134 122 l10 -13 h14 v13 z M164 109 h16 l11 13 h-27 z" fill="none" strokeWidth="2" strokeLinejoin="round" />
        <circle className="paper" cx="126" cy="152" r="10" />
        <circle className="ink" cx="126" cy="152" r="10" fill="none" strokeWidth="2.6" />
        <circle className="paper" cx="194" cy="152" r="10" />
        <circle className="ink" cx="194" cy="152" r="10" fill="none" strokeWidth="2.6" />
        <rect className="lime" x="200" y="128" width="12" height="6" rx="3" />
      </g>

      <g className="flag">
        <path className="ink" d="M226 104 V62" fill="none" strokeWidth="2.6" strokeLinecap="round" />
        <path className="cta" d="M226 62 h30 l-8 9 l8 9 h-30 z" />
      </g>

      <g className="left">
        <rect className="surface" x="34" y="134" width="20" height="24" rx="5" />
        <rect className="ink" x="34" y="134" width="20" height="24" rx="5" fill="none" strokeWidth="2" />
        <path className="ink" d="M40 134 v-5 h8 v5" fill="none" strokeWidth="2" />
        <path className="accent" d="M60 160 v-30 a14 14 0 0 1 28 0 v30 z" />
        <circle className="skin" cx="74" cy="104" r="11" />
        <path className="deep" d="M63 102 a11 11 0 0 1 22 -2 c-6 -1 -14 -1 -22 2z" />
        <path className="ink" d="M62 136 l-8 -2" fill="none" strokeWidth="2.6" strokeLinecap="round" />
        <g className="arm">
          <path className="ink" d="M86 132 l10 -20 l4 -10" fill="none" strokeWidth="2.6" strokeLinecap="round" />
          <circle className="skin" cx="100" cy="100" r="4" />
        </g>
      </g>

      <g className="right">
        <path className="deep" d="M240 160 v-30 a14 14 0 0 1 28 0 v30 z" />
        <circle className="skin" cx="254" cy="104" r="11" />
        <path className="deep" d="M243 101 h22 l-2 -6 h-18 z" />
        <rect className="lime" x="241" y="99" width="26" height="4" rx="2" />
        <path className="ink" d="M242 132 l-8 -18 l-2 -10" fill="none" strokeWidth="2.6" strokeLinecap="round" />
        <circle className="skin" cx="232" cy="102" r="4" />
        <g className="arm">
          <path className="ink" d="M266 132 l8 -18 l2 -10" fill="none" strokeWidth="2.6" strokeLinecap="round" />
          <circle className="skin" cx="276" cy="102" r="4" />
        </g>
      </g>

      {BITS.map(([x, y, tone], i) => (
        <rect
          key={i}
          className={`bit bit-${i} ${tone}`}
          x={x - 3}
          y={y - 5}
          width="6"
          height="10"
          rx="2"
        />
      ))}
    </Svg>
  );
}
