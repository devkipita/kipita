"use client";

import styled from "styled-components";

const Svg = styled.svg`
  display: block;
  width: 100%;
  max-width: 220px;
  height: auto;
`;

const BOX = { viewBox: "0 0 200 104", fill: "none" } as const;

function Account() {
  return (
    <Svg {...BOX} aria-hidden>
      <rect x="2" y="6" width="120" height="26" rx="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
      <rect x="14" y="16" width="52" height="6" rx="3" fill="currentColor" fillOpacity="0.28" />
      <rect x="2" y="42" width="120" height="26" rx="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
      <rect x="14" y="52" width="36" height="6" rx="3" fill="currentColor" fillOpacity="0.28" />
      <rect x="2" y="78" width="74" height="24" rx="12" fill="currentColor" fillOpacity="0.85" />
      <circle cx="162" cy="34" r="17" fill="currentColor" fillOpacity="0.9" />
      <path d="M136 82a26 26 0 0 1 52 0" fill="currentColor" fillOpacity="0.9" />
    </Svg>
  );
}

function Find() {
  return (
    <Svg {...BOX} aria-hidden>
      <circle cx="40" cy="38" r="24" stroke="currentColor" strokeWidth="4" strokeOpacity="0.85" />
      <path d="m58 56 18 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.85" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="96" y={12 + i * 30} width="102" height="22" rx="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity={i === 1 ? 0.9 : 0.26} />
          <circle cx="110" cy={23 + i * 30} r="5" fill="currentColor" fillOpacity={i === 1 ? 0.9 : 0.26} />
          <rect x="122" y={20 + i * 30} width="40" height="5" rx="2.5" fill="currentColor" fillOpacity={i === 1 ? 0.6 : 0.2} />
          <rect x="172" y={19 + i * 30} width="18" height="7" rx="3.5" fill="currentColor" fillOpacity={i === 1 ? 0.9 : 0.22} />
        </g>
      ))}
    </Svg>
  );
}

function Pay() {
  return (
    <Svg {...BOX} aria-hidden>
      <path d="M34 48V34a16 16 0 0 1 32 0v14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.9" />
      <rect x="22" y="48" width="56" height="42" rx="13" fill="currentColor" fillOpacity="0.9" />
      <path d="M96 69h26m-9-9 9 9-9 9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.4" />
      <rect x="138" y="30" width="60" height="40" rx="12" stroke="currentColor" strokeWidth="3" strokeOpacity="0.5" />
      <rect x="148" y="44" width="30" height="6" rx="3" fill="currentColor" fillOpacity="0.5" />
      <rect x="148" y="56" width="18" height="5" rx="2.5" fill="currentColor" fillOpacity="0.3" />
    </Svg>
  );
}

function Ride() {
  return (
    <Svg {...BOX} aria-hidden>
      <path d="M8 76h184" stroke="currentColor" strokeWidth="22" strokeLinecap="round" strokeOpacity="0.12" />
      <path d="M24 76h22M68 76h22M112 76h22M156 76h22" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.35" />
      <circle cx="30" cy="76" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.45" />
      <circle cx="30" cy="76" r="4" fill="currentColor" fillOpacity="0.9" />
      <path
        d="M168 20a11 11 0 0 1 11 11c0 8.2-11 18.6-11 18.6S157 39.2 157 31a11 11 0 0 1 11-11Zm0 7.4a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z"
        fill="currentColor"
        fillOpacity="0.9"
        fillRule="evenodd"
      />
      <path d="m84 36 9 9 19-19" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
      <circle cx="98" cy="34" r="26" stroke="currentColor" strokeWidth="3" strokeOpacity="0.28" />
    </Svg>
  );
}

const SCENES = [Account, Find, Pay, Ride];

export function HelpArt({ step }: { step: number }) {
  const Scene = SCENES[step] ?? Account;
  return <Scene />;
}
