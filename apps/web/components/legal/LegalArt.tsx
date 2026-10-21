"use client";

import styled from "styled-components";

const Art = styled.svg`
  display: block;
  overflow: visible;
`;

const deep = "var(--n-green-deep)";
const green = "var(--n-green)";
const sage = "var(--n-sage)";
const lime = "var(--n-cta-bg)";
const tan = "var(--n-tan)";
const panel = "var(--n-surface-3)";
const edge = "var(--n-line)";

function Shield({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M46 2 86 18v34c0 27-17 46-40 54C23 98 6 79 6 52V18L46 2Z"
        fill={green}
      />
      <path d="M46 2 86 18v34c0 27-17 46-40 54V2Z" fill={deep} />
      <path
        d="M24 56h44M30 56a8 8 0 0 1 8-8h16a8 8 0 0 1 8 8"
        stroke={lime}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="33" cy="62" r="5" fill={lime} />
      <circle cx="59" cy="62" r="5" fill={lime} />
    </g>
  );
}

function Spark({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M8 0c.8 4.6 2.6 6.4 7.2 7.2-4.6.8-6.4 2.6-7.2 7.2-.8-4.6-2.6-6.4-7.2-7.2C5.4 6.4 7.2 4.6 8 0Z"
      fill={sage}
      opacity="0.75"
    />
  );
}

export function OverviewArt() {
  return (
    <Art viewBox="0 0 400 210" fill="none" aria-hidden>
      <ellipse cx="200" cy="186" rx="150" ry="12" fill={panel} />
      <Shield x={154} y={46} />

      <g transform="translate(26 62)">
        <rect width="104" height="76" rx="14" fill={panel} stroke={edge} />
        <rect x="16" y="20" width="56" height="7" rx="3.5" fill={sage} opacity="0.7" />
        <rect x="16" y="36" width="72" height="7" rx="3.5" fill={edge} />
        <rect x="16" y="52" width="40" height="7" rx="3.5" fill={edge} />
        <circle cx="92" cy="84" r="22" fill="none" stroke={green} strokeWidth="7" />
        <path d="M108 100l18 18" stroke={green} strokeWidth="7" strokeLinecap="round" />
      </g>

      <g transform="translate(280 48)">
        <rect width="94" height="64" rx="12" fill={deep} />
        <path
          d="M8 14l39 26 39-26"
          stroke={sage}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      <g transform="translate(286 124)">
        <path
          d="M30 0a24 24 0 0 1 24 24c0 17.8-24 40-24 40S6 41.8 6 24A24 24 0 0 1 30 0Z"
          fill={tan}
        />
        <circle cx="30" cy="24" r="9" fill="var(--n-bg)" />
      </g>

      <Spark x={124} y={30} s={1.2} />
      <Spark x={262} y={150} />
      <Spark x={150} y={154} s={0.8} />
    </Art>
  );
}

export function PrivacyArt() {
  return (
    <Art viewBox="0 0 400 210" fill="none" aria-hidden>
      <ellipse cx="200" cy="186" rx="150" ry="12" fill={panel} />
      <Shield x={156} y={40} />

      <g transform="translate(186 92)">
        <rect x="2" y="16" width="36" height="30" rx="8" fill={lime} />
        <path
          d="M10 16v-6a10 10 0 0 1 20 0v6"
          stroke={lime}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="20" cy="30" r="5" fill={deep} />
      </g>

      <g transform="translate(24 54)">
        <rect width="108" height="92" rx="16" fill={panel} stroke={edge} />
        <rect x="18" y="20" width="42" height="8" rx="4" fill={sage} opacity="0.75" />
        <rect x="18" y="40" width="72" height="8" rx="4" fill={edge} />
        <rect x="18" y="60" width="58" height="8" rx="4" fill={edge} />
        <circle cx="86" cy="74" r="12" fill={green} />
        <path
          d="M80 74l4.5 5 8-9"
          stroke="var(--n-bg)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      <g transform="translate(272 66)">
        <path
          d="M4 28c14-18 46-18 60 0-14 18-46 18-60 0Z"
          fill={deep}
          stroke={sage}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle cx="34" cy="28" r="10" fill={sage} />
        <circle cx="34" cy="28" r="4" fill={deep} />
      </g>

      <g transform="translate(278 124)">
        <rect width="80" height="50" rx="12" fill={panel} stroke={edge} />
        <rect x="14" y="16" width="34" height="7" rx="3.5" fill={edge} />
        <rect x="14" y="30" width="22" height="7" rx="3.5" fill={edge} />
        <rect x="54" y="16" width="14" height="21" rx="7" fill={green} />
        <circle cx="61" cy="22" r="4" fill="var(--n-bg)" />
      </g>

      <Spark x={126} y={26} s={1.1} />
      <Spark x={254} y={160} s={0.9} />
    </Art>
  );
}

export function TermsArt() {
  return (
    <Art viewBox="0 0 400 210" fill="none" aria-hidden>
      <ellipse cx="200" cy="186" rx="150" ry="12" fill={panel} />

      <g transform="translate(142 22)">
        <rect width="124" height="150" rx="16" fill={panel} stroke={edge} />
        <rect x="22" y="26" width="58" height="9" rx="4.5" fill={sage} opacity="0.75" />
        <rect x="22" y="50" width="80" height="8" rx="4" fill={edge} />
        <rect x="22" y="68" width="80" height="8" rx="4" fill={edge} />
        <rect x="22" y="86" width="54" height="8" rx="4" fill={edge} />
        <circle cx="94" cy="118" r="24" fill={green} />
        <path
          d="M83 118l8 9 15-18"
          stroke={lime}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      <g transform="translate(22 92)">
        <path
          d="M8 44h88l-12-26a12 12 0 0 0-11-7H31a12 12 0 0 0-11 7L8 44Z"
          fill={deep}
        />
        <rect y="42" width="104" height="26" rx="10" fill={green} />
        <circle cx="26" cy="70" r="10" fill={deep} />
        <circle cx="78" cy="70" r="10" fill={deep} />
        <rect x="30" y="20" width="44" height="18" rx="6" fill={sage} opacity="0.45" />
      </g>

      <g transform="translate(290 86)">
        <rect width="84" height="60" rx="14" fill={deep} />
        <path
          d="M18 30h48M48 16l18 14-18 14"
          stroke={sage}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      <Spark x={110} y={34} s={1.1} />
      <Spark x={290} y={48} />
      <Spark x={288} y={158} s={0.8} />
    </Art>
  );
}

export function CookiesArt() {
  return (
    <Art viewBox="0 0 400 210" fill="none" aria-hidden>
      <ellipse cx="200" cy="186" rx="150" ry="12" fill={panel} />

      <g transform="translate(96 28)">
        <rect width="208" height="140" rx="18" fill={panel} stroke={edge} />
        <path d="M0 34h208" stroke={edge} strokeWidth="2" />
        <circle cx="22" cy="17" r="5" fill={tan} />
        <circle cx="40" cy="17" r="5" fill={edge} />
        <circle cx="58" cy="17" r="5" fill={edge} />
        <rect x="26" y="58" width="92" height="9" rx="4.5" fill={sage} opacity="0.7" />
        <rect x="26" y="80" width="120" height="8" rx="4" fill={edge} />
        <rect x="26" y="100" width="76" height="8" rx="4" fill={edge} />
        <rect x="150" y="54" width="36" height="20" rx="10" fill={green} />
        <circle cx="176" cy="64" r="7" fill="var(--n-bg)" />
        <rect x="150" y="94" width="36" height="20" rx="10" fill={edge} />
        <circle cx="160" cy="104" r="7" fill="var(--n-bg)" />
      </g>

      <g transform="translate(246 108)">
        <circle cx="46" cy="46" r="46" fill={tan} />
        <circle cx="30" cy="32" r="7" fill={deep} opacity="0.65" />
        <circle cx="58" cy="26" r="5" fill={deep} opacity="0.65" />
        <circle cx="64" cy="56" r="8" fill={deep} opacity="0.65" />
        <circle cx="32" cy="62" r="5" fill={deep} opacity="0.65" />
        <circle cx="46" cy="46" r="4" fill={deep} opacity="0.45" />
      </g>

      <Spark x={60} y={46} s={1.1} />
      <Spark x={68} y={136} s={0.85} />
    </Art>
  );
}

export function RefundsArt() {
  return (
    <Art viewBox="0 0 400 210" fill="none" aria-hidden>
      <ellipse cx="200" cy="186" rx="150" ry="12" fill={panel} />

      <g transform="translate(140 48)">
        <rect width="128" height="118" rx="18" fill={deep} />
        <rect x="16" y="16" width="96" height="86" rx="12" fill={green} />
        <circle cx="64" cy="59" r="28" fill={lime} />
        <path
          d="M64 42v34M56 50h14a7 7 0 0 1 0 14H56M56 64h18"
          stroke={deep}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      <path
        d="M118 78c-26 10-32 44-8 62 18 13 44 12 62-2"
        stroke={sage}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="2 18"
        fill="none"
      />
      <path d="M170 136l10 4-4 10" stroke={sage} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <g transform="translate(28 56)">
        <rect width="74" height="116" rx="16" fill={panel} stroke={edge} />
        <rect x="24" y="12" width="26" height="5" rx="2.5" fill={edge} />
        <rect x="14" y="30" width="46" height="8" rx="4" fill={sage} opacity="0.7" />
        <rect x="14" y="48" width="34" height="7" rx="3.5" fill={edge} />
        <rect x="14" y="72" width="46" height="22" rx="8" fill={green} />
      </g>

      <g transform="translate(290 78)">
        <circle cx="38" cy="38" r="38" fill={tan} opacity="0.9" />
        <path
          d="M38 18v40M28 28h14a7 7 0 0 1 0 13H28M28 41h18"
          stroke="var(--n-bg)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      <Spark x={112} y={30} s={1.1} />
      <Spark x={288} y={160} s={0.85} />
    </Art>
  );
}

export function FaqArt() {
  return (
    <Art viewBox="0 0 400 210" fill="none" aria-hidden>
      <ellipse cx="200" cy="186" rx="150" ry="12" fill={panel} />

      <g transform="translate(58 34)">
        <path
          d="M18 0h140a18 18 0 0 1 18 18v64a18 18 0 0 1-18 18H64l-30 24V100H18A18 18 0 0 1 0 82V18A18 18 0 0 1 18 0Z"
          fill={deep}
        />
        <path
          d="M74 38a14 14 0 1 1 20 13c-4 2-6 5-6 9M88 72h.1"
          stroke={lime}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      <g transform="translate(206 106)">
        <path
          d="M18 0h114a18 18 0 0 1 18 18v38a18 18 0 0 1-18 18H60l-24 18V74H18A18 18 0 0 1 0 56V18A18 18 0 0 1 18 0Z"
          fill={green}
        />
        <path
          d="M28 26h94M28 46h58"
          stroke={sage}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      <g transform="translate(22 128)">
        <circle cx="28" cy="28" r="28" fill={tan} />
        <circle cx="28" cy="21" r="10" fill="var(--n-bg)" opacity="0.85" />
        <path d="M10 48a18 18 0 0 1 36 0" fill="var(--n-bg)" opacity="0.85" />
      </g>

      <Spark x={246} y={44} s={1.1} />
      <Spark x={200} y={80} s={0.8} />
    </Art>
  );
}
