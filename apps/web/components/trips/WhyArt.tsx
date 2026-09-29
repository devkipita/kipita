"use client";

import styled from "styled-components";

/**
 * Illustrations for the Why-Kipita bento.
 *
 * Each one draws the claim its card makes rather than decorating it: the escrow
 * card shows money sitting at the middle of a three-step track, the verified
 * card shows the document being checked, and so on. They read as small pieces
 * of product rather than as clip art, which is what stops the section looking
 * generated.
 *
 * Colours come from three CSS variables the card sets, so one drawing works on
 * a dark card and a light one: --art-ink, --art-accent, --art-surface.
 */

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  font-family: inherit;
`;

/** The faint wireframe that bleeds off the tall card, as MetaMask's globe does. */
const WireWrap = styled.svg`
  position: absolute;
  right: -18%;
  bottom: -26%;
  width: 92%;
  height: auto;
  pointer-events: none;
  color: var(--art-ink);
  opacity: 0.16;
`;

export function Wireframe() {
  return (
    <WireWrap viewBox="0 0 300 300" aria-hidden="true" fill="none">
      <g stroke="currentColor" strokeWidth="1.1">
        <circle cx="150" cy="150" r="148" />
        <ellipse cx="150" cy="150" rx="58" ry="148" />
        <ellipse cx="150" cy="150" rx="106" ry="148" />
        <ellipse cx="150" cy="150" rx="148" ry="54" />
        <ellipse cx="150" cy="150" rx="148" ry="102" />
        <path d="M2 150h296" />
      </g>
    </WireWrap>
  );
}

/* ── Escrow: the fare sitting at the middle of a three-step track ── */

export function EscrowArt() {
  return (
    <Svg viewBox="0 0 300 176" aria-hidden="true">
      <rect width="300" height="176" rx="22" fill="var(--art-surface)" />

      <text
        x="24"
        y="42"
        fill="var(--art-ink)"
        fillOpacity="0.62"
        fontSize="13"
        fontWeight="600"
      >
        Nairobi to Mombasa
      </text>
      <text
        x="24"
        y="76"
        fill="var(--art-ink)"
        fontSize="30"
        fontWeight="800"
        letterSpacing="-1"
      >
        KES 2,500
      </text>

      <rect
        x="196"
        y="46"
        width="80"
        height="30"
        rx="15"
        fill="var(--art-accent)"
        fillOpacity="0.22"
      />
      <text
        x="236"
        y="66"
        fill="var(--art-accent)"
        fontSize="13"
        fontWeight="800"
        textAnchor="middle"
      >
        Held
      </text>

      <g stroke="var(--art-ink)" strokeOpacity="0.28" strokeWidth="2">
        <path d="M34 122h94" />
        <path d="M172 122h94" strokeDasharray="5 6" />
      </g>

      <circle cx="34" cy="122" r="7" fill="var(--art-ink)" fillOpacity="0.45" />
      <circle cx="150" cy="122" r="14" fill="var(--art-accent)" />
      <circle cx="150" cy="122" r="21" stroke="var(--art-accent)" strokeOpacity="0.35" strokeWidth="2" fill="none" />
      <circle cx="266" cy="122" r="7" stroke="var(--art-ink)" strokeOpacity="0.4" strokeWidth="2" fill="none" />

      <g fill="var(--art-ink)" fillOpacity="0.55" fontSize="11" fontWeight="600">
        <text x="34" y="156" textAnchor="middle">
          Paid
        </text>
        <text x="150" y="156" textAnchor="middle" fillOpacity="0.95">
          Held
        </text>
        <text x="266" y="156" textAnchor="middle">
          Released
        </text>
      </g>
    </Svg>
  );
}

/* ── Verified: the licence being checked ── */

export function VerifiedArt() {
  return (
    <Svg viewBox="0 0 300 150" aria-hidden="true">
      <rect x="4" y="8" width="292" height="134" rx="20" fill="var(--art-surface)" />

      <circle cx="58" cy="56" r="24" fill="var(--art-accent)" fillOpacity="0.16" />
      <circle cx="58" cy="48" r="9" fill="var(--art-accent)" fillOpacity="0.65" />
      <path
        d="M42 72a16 16 0 0 1 32 0Z"
        fill="var(--art-accent)"
        fillOpacity="0.65"
      />

      <rect x="96" y="40" width="116" height="13" rx="6.5" fill="var(--art-ink)" fillOpacity="0.72" />
      <rect x="96" y="62" width="74" height="10" rx="5" fill="var(--art-ink)" fillOpacity="0.32" />

      <circle cx="248" cy="52" r="19" fill="var(--art-accent)" />
      <path
        d="m240 52 6 6 11-12"
        stroke="var(--art-surface)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <g>
        <rect x="28" y="98" width="112" height="30" rx="15" fill="var(--art-accent)" fillOpacity="0.14" />
        <path d="m48 113 5 5 9-10" stroke="var(--art-accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="74" y="118" fill="var(--art-ink)" fontSize="12" fontWeight="700">
          Licence
        </text>
      </g>
      <g>
        <rect x="150" y="98" width="86" height="30" rx="15" fill="var(--art-accent)" fillOpacity="0.14" />
        <path d="m170 113 5 5 9-10" stroke="var(--art-accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="196" y="118" fill="var(--art-ink)" fontSize="12" fontWeight="700">
          ID
        </text>
      </g>
    </Svg>
  );
}

/* ── M-Pesa: the prompt that arrives on the phone ── */

export function MpesaArt() {
  return (
    <Svg viewBox="0 0 300 150" aria-hidden="true">
      <rect x="4" y="4" width="292" height="60" rx="18" fill="var(--art-surface)" />
      <circle cx="38" cy="34" r="12" fill="var(--art-accent)" fillOpacity="0.18" />
      <rect
        x="33"
        y="27"
        width="10"
        height="14"
        rx="2.5"
        fill="var(--art-accent)"
        fillOpacity="0.7"
      />
      <rect x="62" y="22" width="96" height="11" rx="5.5" fill="var(--art-ink)" fillOpacity="0.62" />
      <rect x="62" y="40" width="58" height="9" rx="4.5" fill="var(--art-ink)" fillOpacity="0.28" />
      <text
        x="276"
        y="39"
        fill="var(--art-ink)"
        fillOpacity="0.72"
        fontSize="13"
        fontWeight="800"
        textAnchor="end"
      >
        07·· ··· 418
      </text>

      <rect x="4" y="78" width="292" height="62" rx="20" fill="var(--art-accent)" />
      <text
        x="150"
        y="116"
        fill="var(--art-surface)"
        fontSize="17"
        fontWeight="800"
        textAnchor="middle"
        letterSpacing="-0.3"
      >
        Pay KES 2,500
      </text>
    </Svg>
  );
}

/* ── Alerts: the road ahead, with what people have reported on it ── */

export function AlertsArt() {
  return (
    <Svg viewBox="0 0 560 150" aria-hidden="true">
      <path
        d="M-10 118C90 118 120 66 220 66s140 30 240 30 120-34 120-34"
        stroke="var(--art-ink)"
        strokeOpacity="0.14"
        strokeWidth="30"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M-10 118C90 118 120 66 220 66s140 30 240 30 120-34 120-34"
        stroke="var(--art-surface)"
        strokeWidth="2.5"
        strokeDasharray="12 14"
        strokeLinecap="round"
        fill="none"
      />

      <g>
        <circle cx="120" cy="96" r="17" fill="var(--art-accent)" />
        <path
          d="M120 87.5 126.5 103h-13Z"
          fill="var(--art-surface)"
        />
      </g>

      <g>
        <circle cx="300" cy="72" r="17" fill="var(--art-accent)" fillOpacity="0.82" />
        <path
          d="M300 63.5a8 8 0 0 1 8 8c0 5.6-8 12.5-8 12.5s-8-6.9-8-12.5a8 8 0 0 1 8-8Z"
          fill="var(--art-surface)"
        />
      </g>

      <g>
        <circle cx="470" cy="92" r="17" fill="var(--art-accent)" fillOpacity="0.62" />
        <rect
          x="463"
          y="85"
          width="14"
          height="14"
          rx="3"
          fill="var(--art-surface)"
        />
      </g>

      <g>
        <rect x="28" y="16" width="146" height="34" rx="17" fill="var(--art-surface)" />
        <circle cx="48" cy="33" r="6" fill="var(--art-accent)" />
        <text x="64" y="38" fill="var(--art-ink)" fontSize="13" fontWeight="700">
          Jam at Salgaa
        </text>
      </g>
      <g>
        <rect x="358" y="16" width="174" height="34" rx="17" fill="var(--art-surface)" fillOpacity="0.72" />
        <circle cx="378" cy="33" r="6" fill="var(--art-accent)" fillOpacity="0.7" />
        <text x="394" y="38" fill="var(--art-ink)" fillOpacity="0.8" fontSize="13" fontWeight="700">
          Police check ahead
        </text>
      </g>
    </Svg>
  );
}
