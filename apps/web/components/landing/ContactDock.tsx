"use client";

import { useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { dur, ease } from "@/lib/motion";
import { Reveal } from "../anim/Reveal";
import { SupportDock } from "./SupportDock";

type CardTone = {
  bg: string; // deep card background
  circle: string; // even darker icon disc
  icon: string; // light accent (icon fill)
  title: string; // light same-hue title
  sub: string; // softer same-hue subtitle
};

const TONES = {
  chat: {
    bg: "#14392a",
    circle: "#0b2b1b",
    icon: "#e5ffc3",
    title: "#e5ffc3",
    sub: "#a9d4b0",
  },
  report: {
    bg: "#d4b896",
    circle: "#0e0e0e",
    icon: "#d4b896",
    title: "#0e0e0e",
    sub: "#5c4e3b",
  },
  call: {
    bg: "#e5ffc3",
    circle: "#14392a",
    icon: "#e5ffc3",
    title: "#14392a",
    sub: "#3f5722",
  },
  email: {
    bg: "#9ec5a2",
    circle: "#0e0e0e",
    icon: "#9ec5a2",
    title: "#0e0e0e",
    sub: "#2f4a38",
  },
} as const satisfies Record<string, CardTone>;

const ContactGrid = styled(Reveal)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
`;

const cardCss = css<{ $tone: CardTone }>`
  background: ${({ $tone }) => $tone.bg};
  border: none;
  border-radius: 26px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 220px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  transition:
    transform ${dur.medium4}ms ${ease.emphasizedDecelerate},
    box-shadow ${dur.medium4}ms ${ease.emphasizedDecelerate};

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.4);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }

  @media (max-width: 720px) {
    border-radius: 20px;
    padding: 18px;
    gap: 14px;
    min-height: 0;
  }
`;

const CardBody = styled.span`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ContactCardButton = styled.button<{ $tone: CardTone }>`
  ${cardCss}
`;

const ContactCardLink = styled.a<{ $tone: CardTone }>`
  ${cardCss}
`;

const typing = keyframes`
  0%, 60%, 100% { transform: none; }
  30%           { transform: translateY(-5px); }
`;

const ping = keyframes`
  0%   { opacity: 0.12; }
  40%  { opacity: 1; }
  100% { opacity: 0.12; }
`;

const nudgeOut = keyframes`
  0%, 100% { transform: none; }
  50%      { transform: translateX(7px); }
`;

const wave = keyframes`
  0%, 100% { transform: none; }
  50%      { transform: skewY(-4deg); }
`;

const Art = styled.span`
  display: block;

  svg {
    display: block;
    width: 100%;
    max-width: 148px;
    height: auto;
  }

  [data-live] {
    transform-box: fill-box;
    transform-origin: center;
  }
  [data-live="flag"] {
    transform-origin: left bottom;
  }

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    button:hover &,
    a:hover & {
      [data-live="dot"] {
        animation: ${typing} 900ms ${ease.standard} infinite;
      }
      [data-live="dot"]:nth-of-type(2) {
        animation-delay: 140ms;
      }
      [data-live="dot"]:nth-of-type(3) {
        animation-delay: 280ms;
      }
      [data-live="flag"] {
        animation: ${wave} ${dur.extraLong1}ms ${ease.standard} infinite;
      }
      [data-live="arc"] {
        animation: ${ping} 1400ms ${ease.standardDecelerate} infinite;
      }
      [data-live="arc"]:nth-of-type(2) {
        animation-delay: 180ms;
      }
      [data-live="arc"]:nth-of-type(3) {
        animation-delay: 360ms;
      }
      [data-live="send"] {
        animation: ${nudgeOut} ${dur.long4}ms ${ease.emphasized} infinite;
      }
    }
  }

  @media (max-width: 720px) {
    svg {
      max-width: 118px;
    }
  }
`;

const ART = { viewBox: "0 0 96 56", fill: "none" } as const;

function ChatArt({ t }: { t: CardTone }) {
  return (
    <svg {...ART} aria-hidden>
      <path
        d="M16 2h28a12 12 0 0 1 12 12v2a12 12 0 0 1-12 12H18L6 38V14A12 12 0 0 1 16 2Z"
        stroke={t.title}
        strokeWidth="3"
        strokeOpacity="0.45"
      />
      <rect x="38" y="24" width="56" height="29" rx="13" fill={t.title} />
      {[53, 66, 79].map((cx) => (
        <circle key={cx} data-live="dot" cx={cx} cy="38.5" r="3.6" fill={t.bg} />
      ))}
    </svg>
  );
}

function ReportArt({ t }: { t: CardTone }) {
  return (
    <svg {...ART} aria-hidden>
      <path
        d="M2 47h92"
        stroke={t.title}
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.22"
      />
      <path
        d="M14 47h10M36 47h10M58 47h10M80 47h10"
        stroke={t.title}
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.22"
      />
      <g data-live="flag">
        <path
          d="M30 47V7"
          stroke={t.title}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M32 7h26l-7 9.5 7 9.5H32V7Z" fill={t.title} />
      </g>
      <circle cx="30" cy="47" r="6" fill={t.title} />
    </svg>
  );
}

function CallArt({ t }: { t: CardTone }) {
  return (
    <svg {...ART} aria-hidden>
      <g transform="rotate(-26 24 28)">
        <rect
          x="13"
          y="5"
          width="22"
          height="46"
          rx="9"
          stroke={t.title}
          strokeWidth="3.5"
        />
        <path
          d="M20 12h8"
          stroke={t.title}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M21 44h6"
          stroke={t.title}
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />
      </g>
      <path
        data-live="arc"
        d="M57 17.3a14 14 0 0 1 0 21.4"
        stroke={t.title}
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
      <path
        data-live="arc"
        d="M62.8 10.4a23 23 0 0 1 0 35.2"
        stroke={t.title}
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
      <path
        data-live="arc"
        d="M68.6 3.5a32 32 0 0 1 0 49"
        stroke={t.title}
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.22"
      />
    </svg>
  );
}

function MailArt({ t }: { t: CardTone }) {
  return (
    <svg {...ART} aria-hidden>
      <rect
        x="2"
        y="8"
        width="68"
        height="42"
        rx="10"
        stroke={t.title}
        strokeWidth="3"
      />
      <path
        d="m6 14 28 19a4 4 0 0 0 4 0l28-19"
        stroke={t.title}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.55"
      />
      <path
        data-live="send"
        d="M78 19h16M78 29h12M78 39h16"
        stroke={t.title}
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
    </svg>
  );
}

const CardTitle = styled.b<{ $tone: CardTone }>`
  font-weight: 800;
  font-size: 23px;
  line-height: 1.1;
  color: ${({ $tone }) => $tone.title};
  letter-spacing: -0.02em;

  @media (max-width: 720px) {
    font-size: 17px;
  }
`;

const CardText = styled.small<{ $tone: CardTone }>`
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: ${({ $tone }) => $tone.sub};

  @media (max-width: 720px) {
    font-size: 13px;
    line-height: 1.45;
  }
`;

const phone = "+254700000000";

export function ContactDock() {
  const [signal, setSignal] = useState<{
    mode: "support" | "report";
    nonce: number;
  }>();

  const open = (mode: "support" | "report") =>
    setSignal((s) => ({ mode, nonce: (s?.nonce ?? 0) + 1 }));

  return (
    <>
      <ContactGrid stagger={0.07}>
        <ContactCardButton
          type="button"
          $tone={TONES.chat}
          onClick={() => open("support")}
        >
          <Art>
            <ChatArt t={TONES.chat} />
          </Art>
          <CardBody>
            <CardTitle $tone={TONES.chat}>Live chat</CardTitle>
            <CardText $tone={TONES.chat}>w
              Talk to support now. Average reply under two minutes.
            </CardText>
          </CardBody>
        </ContactCardButton>

        <ContactCardButton
          type="button"
          $tone={TONES.report}
          onClick={() => open("report")}
        >
          <Art>
            <ReportArt t={TONES.report} />
          </Art>
          <CardBody>
            <CardTitle $tone={TONES.report}>Report an issue</CardTitle>
            <CardText $tone={TONES.report}>
              Something went wrong on a trip? Flag it and we investigate.
            </CardText>
          </CardBody>
        </ContactCardButton>

        <ContactCardLink href={`tel:+254701930385`} $tone={TONES.call}>
          <Art>
            <CallArt t={TONES.call} />
          </Art>
          <CardBody>
            <CardTitle $tone={TONES.call}>Call us</CardTitle>
            <CardText $tone={TONES.call}>
              +254 701 930385 · Mon–Sun, 6am to 11pm EAT.
            </CardText>
          </CardBody>
        </ContactCardLink>

        <ContactCardLink href="mailto:hello@kipita.co.ke" $tone={TONES.email}>
          <Art>
            <MailArt t={TONES.email} />
          </Art>
          <CardBody>
            <CardTitle $tone={TONES.email}>Email</CardTitle>
            <CardText $tone={TONES.email}>
              hello@kipita.co.ke · we answer within a working day.
            </CardText>
          </CardBody>
        </ContactCardLink>
      </ContactGrid>

      <SupportDock openSignal={signal} />
    </>
  );
}
