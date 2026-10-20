"use client";

import type { ReactNode } from "react";
import styled from "styled-components";

const Svg = styled.svg<{ $tone?: "bad" }>`
  display: block;
  width: 100%;
  max-width: 192px;
  height: auto;
  margin: 0 auto;

  .ink {
    stroke: ${({ theme }) => theme.color.onSurfaceVariant};
    stroke-width: 2.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .ink-fill {
    fill: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .thin {
    stroke-width: 2.2;
  }
  .accent {
    stroke: ${({ theme, $tone }) =>
      $tone === "bad" ? theme.color.error : theme.color.primary};
    stroke-width: 2.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .accent-fill {
    fill: ${({ theme, $tone }) =>
      $tone === "bad" ? theme.color.error : theme.color.primary};
  }
  .on-accent {
    stroke: ${({ theme }) => theme.color.onPrimary};
    stroke-width: 3.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;

function Art({ children, tone }: { children: ReactNode; tone?: "bad" }) {
  return (
    <Svg viewBox="0 0 180 128" fill="none" aria-hidden="true" $tone={tone}>
      {children}
    </Svg>
  );
}

function Ground({ cx, rx }: { cx: number; rx: number }) {
  return (
    <ellipse
      cx={cx}
      cy="118"
      rx={rx}
      ry="5"
      className="ink-fill"
      fillOpacity="0.08"
    />
  );
}

function Coin({
  cx,
  cy,
  r = 14,
  dashed = false,
}: {
  cx: number;
  cy: number;
  r?: number;
  dashed?: boolean;
}) {
  if (dashed) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        className="ink thin"
        strokeOpacity="0.3"
        strokeDasharray="4 6"
      />
    );
  }
  const u = r / 14;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="accent-fill" fillOpacity="0.16" />
      <circle cx={cx} cy={cy} r={r} className="accent" />
      <path
        d={`M${cx - 4 * u} ${cy - 6 * u}v${12 * u}M${cx + 4 * u} ${cy - 6 * u}l${-8 * u} ${6 * u} ${8 * u} ${6 * u}`}
        className="accent"
        strokeOpacity="0.75"
        strokeWidth={2.2 * u}
      />
    </g>
  );
}

function Wallet() {
  return (
    <g>
      <rect
        x="52"
        y="42"
        width="74"
        height="22"
        rx="7"
        className="ink thin"
        strokeOpacity="0.28"
      />
      <rect
        x="34"
        y="54"
        width="112"
        height="56"
        rx="15"
        className="ink"
        strokeOpacity="0.45"
      />
      <rect
        x="100"
        y="70"
        width="46"
        height="24"
        rx="12"
        className="accent"
        strokeOpacity="0.5"
      />
      <circle cx="116" cy="82" r="4" className="accent-fill" fillOpacity="0.6" />
    </g>
  );
}

function Phone({
  children,
  signal = false,
}: {
  children?: ReactNode;
  signal?: boolean;
}) {
  return (
    <g>
      {signal && (
        <g className="accent" fill="none">
          <path d="M130 52a28 28 0 0 1 0 32" strokeOpacity="0.5" />
          <path d="M142 42a44 44 0 0 1 0 52" strokeOpacity="0.24" />
          <path d="M50 52a28 28 0 0 0 0 32" strokeOpacity="0.5" />
          <path d="M38 42a44 44 0 0 0 0 52" strokeOpacity="0.24" />
        </g>
      )}
      <rect
        x="60"
        y="18"
        width="60"
        height="94"
        rx="14"
        className="ink"
        strokeOpacity="0.45"
      />
      <rect
        x="68"
        y="30"
        width="44"
        height="72"
        rx="8"
        className="ink-fill"
        fillOpacity="0.06"
      />
      <path d="M82 24h16" className="ink thin" strokeOpacity="0.3" />
      {children}
    </g>
  );
}

export function WalletShortArt() {
  return (
    <Art>
      <Ground cx={90} rx={54} />
      <Wallet />
      <Coin cx={58} cy={22} />
      <Coin cx={90} cy={22} dashed />
      <Coin cx={122} cy={22} dashed />
    </Art>
  );
}

export function WalletFilledArt() {
  return (
    <Art>
      <Ground cx={90} rx={54} />
      <g className="accent" strokeOpacity="0.4">
        <path d="M78 8v7" />
        <path d="M90 2v7" />
        <path d="M102 8v7" />
      </g>
      <Coin cx={90} cy={30} />
      <Wallet />
      <circle cx="136" cy="100" r="16" className="accent-fill" />
      <path d="M129 100l5 5 10-11" className="on-accent" fill="none" />
    </Art>
  );
}

export function WalletToPhoneArt() {
  return (
    <Art>
      <Ground cx={44} rx={34} />
      <Ground cx={142} rx={26} />

      <rect
        x="22"
        y="50"
        width="44"
        height="14"
        rx="5"
        className="ink thin"
        strokeOpacity="0.28"
      />
      <rect
        x="10"
        y="58"
        width="68"
        height="46"
        rx="12"
        className="ink"
        strokeOpacity="0.45"
      />
      <rect
        x="52"
        y="70"
        width="28"
        height="18"
        rx="9"
        className="accent"
        strokeOpacity="0.45"
      />

      <rect
        x="118"
        y="32"
        width="48"
        height="76"
        rx="12"
        className="ink"
        strokeOpacity="0.45"
      />
      <rect
        x="124"
        y="42"
        width="36"
        height="58"
        rx="7"
        className="ink-fill"
        fillOpacity="0.06"
      />
      <path d="M136 37h12" className="ink thin" strokeOpacity="0.3" />
      <path
        d="M130 66h24"
        className="accent"
        strokeOpacity="0.55"
        strokeWidth="3.2"
      />
      <path d="M130 78h15" className="ink thin" strokeOpacity="0.26" />

      <path
        d="M46 56C58 22 108 18 132 34"
        className="accent"
        strokeOpacity="0.45"
        strokeDasharray="5 7"
        fill="none"
      />
      <Coin cx={85} cy={26} r={13} />
    </Art>
  );
}

export function PinPromptArt() {
  return (
    <Art>
      <Ground cx={90} rx={38} />
      <Phone signal>
        <path
          d="M84 50v-5a6 6 0 0 1 12 0v5"
          className="accent"
          strokeOpacity="0.6"
          fill="none"
        />
        <rect
          x="79"
          y="50"
          width="22"
          height="18"
          rx="5"
          className="accent-fill"
          fillOpacity="0.18"
        />
        <rect x="79" y="50" width="22" height="18" rx="5" className="accent" />
        <circle cx="76" cy="84" r="4" className="accent-fill" />
        <circle cx="86" cy="84" r="4" className="accent-fill" />
        <circle
          cx="96"
          cy="84"
          r="4"
          className="ink thin"
          strokeOpacity="0.32"
        />
        <circle
          cx="106"
          cy="84"
          r="4"
          className="ink thin"
          strokeOpacity="0.32"
        />
      </Phone>
    </Art>
  );
}

export function PaymentFailedArt() {
  return (
    <Art tone="bad">
      <Ground cx={90} rx={38} />
      <g className="accent" strokeOpacity="0.3" strokeDasharray="4 8">
        <path d="M130 54a26 26 0 0 1 0 28" fill="none" />
        <path d="M50 54a26 26 0 0 0 0 28" fill="none" />
      </g>
      <Phone>
        <circle
          cx="90"
          cy="66"
          r="19"
          className="accent-fill"
          fillOpacity="0.14"
        />
        <circle cx="90" cy="66" r="19" className="accent" />
        <path d="M83 59l14 14M97 59l-14 14" className="accent" fill="none" />
      </Phone>
    </Art>
  );
}

export function PaymentWaitingArt() {
  return (
    <Art>
      <Ground cx={90} rx={38} />
      <Phone signal>
        <circle
          cx="90"
          cy="62"
          r="18"
          className="accent-fill"
          fillOpacity="0.12"
        />
        <circle cx="90" cy="62" r="18" className="accent" />
        <path d="M90 52v11l7 5" className="accent" fill="none" />
        <g className="ink-fill" fillOpacity="0.3">
          <circle cx="80" cy="90" r="3" />
          <circle cx="90" cy="90" r="3" />
          <circle cx="100" cy="90" r="3" />
        </g>
      </Phone>
    </Art>
  );
}

export function EscrowHeldArt() {
  const shield =
    "M90 14l36 13v27c0 23-15 38-36 46-21-8-36-23-36-46V27l36-13Z";
  return (
    <Art>
      <Ground cx={90} rx={44} />
      <path className="accent-fill" fillOpacity="0.07" d={shield} />
      <path className="ink" strokeOpacity="0.4" fill="none" d={shield} />
      <Coin cx={90} cy={56} r={17} />
      <circle cx="126" cy="94" r="15" className="accent-fill" />
      <path d="M119 94l5 5 9-10" className="on-accent" fill="none" />
    </Art>
  );
}
