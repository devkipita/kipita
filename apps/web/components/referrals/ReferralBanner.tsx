"use client";

import styled from "styled-components";

const Frame = styled.div`
  position: relative;
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  aspect-ratio: 900 / 300;
  max-height: 260px;
  overflow: hidden;
  background: ${({ theme }) => theme.tone.mint.bg};

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  @media (min-width: 900px) {
    width: 100%;
    margin-inline: 0;
    border-radius: ${({ theme }) => theme.radius.lg};
    aspect-ratio: 1400 / 300;
  }
`;

const SKIN_LIGHT = "#F2C7A8";
const SKIN_DARK = "#8A5A3B";
const SLEEVE_DARK = "#1B2A24";
const SLEEVE_WARM = "#F5C84C";
const BOX = "#12855A";
const BOX_SHADE = "#0B6644";

export function ReferralBanner() {
  return (
    <Frame aria-hidden="true">
      <svg viewBox="0 0 900 300" preserveAspectRatio="xMidYMid slice">
        <g opacity="0.5" stroke="#0B6644" strokeWidth="3" strokeLinecap="round">
          <path d="M120 232c70-52 150-78 240-78" strokeDasharray="2 16" />
          <path d="M780 232c-70-52-150-78-240-78" strokeDasharray="2 16" />
        </g>

        <g fill="#0B6644" opacity="0.28">
          <circle cx="196" cy="86" r="5" />
          <circle cx="712" cy="104" r="6" />
          <circle cx="284" cy="52" r="3.5" />
          <circle cx="628" cy="46" r="4" />
        </g>

        <g transform="translate(0 40)">
          <path
            d="M-30 236h150l86-34 24 48-96 38H-30z"
            fill={SLEEVE_DARK}
          />
          <path
            d="M214 184c26-12 62-16 78-6 14 9 10 26-6 34l-64 28c-18 8-38 2-44-12-6-15 4-30 22-38z"
            fill={SKIN_LIGHT}
          />
          <g fill={SKIN_LIGHT}>
            <rect x="286" y="150" width="70" height="22" rx="11" transform="rotate(-14 286 150)" />
            <rect x="290" y="172" width="78" height="22" rx="11" transform="rotate(-10 290 172)" />
            <rect x="290" y="194" width="72" height="22" rx="11" transform="rotate(-5 290 194)" />
          </g>
        </g>

        <g transform="translate(0 -30)">
          <path
            d="M930 64H770l-84 40-26-46 96-42h174z"
            fill={SLEEVE_WARM}
          />
          <g stroke="#E0B23C" strokeWidth="4" strokeLinecap="round">
            <path d="M802 58l84-38M812 76l84-38M822 94l84-38" />
          </g>
          <path
            d="M690 116c-26 12-62 16-78 6-14-9-10-26 6-34l64-28c18-8 38-2 44 12 6 15-4 30-22 38z"
            fill={SKIN_DARK}
          />
          <g fill={SKIN_DARK}>
            <rect x="548" y="128" width="70" height="22" rx="11" transform="rotate(14 548 128)" />
            <rect x="540" y="150" width="78" height="22" rx="11" transform="rotate(10 540 150)" />
            <rect x="544" y="172" width="72" height="22" rx="11" transform="rotate(5 544 172)" />
          </g>
        </g>

        <g transform="translate(450 150) rotate(-8)">
          <rect x="-96" y="-72" width="192" height="144" rx="14" fill={BOX} />
          <rect x="-96" y="-12" width="192" height="12" fill={BOX_SHADE} />
          <rect x="-16" y="-72" width="32" height="144" fill="#FFFFFF" />
          <rect x="-96" y="-14" width="192" height="30" rx="6" fill="#FFFFFF" />
          <path
            d="M0-74c-34-30-72-22-72 2 0 16 22 26 72 26 50 0 72-10 72-26 0-24-38-32-72-2z"
            fill={BOX_SHADE}
          />
          <path
            d="M0-74c-24-22-50-16-50 0 0 11 16 18 50 18s50-7 50-18c0-16-26-22-50 0z"
            fill="#FFFFFF"
          />
        </g>
      </svg>
    </Frame>
  );
}
