"use client";

import { useState } from "react";
import styled, { css } from "styled-components";
import { Reveal } from "../anim/Reveal";
import { SupportDock } from "./SupportDock";

/**
 * Each contact card keeps its own colour identity: a DEEP tone of that hue for
 * the card, a LIGHTER shade of the SAME hue for the text, and the icon sitting
 * in a darker circle tinted with the light accent. Consistent, clean, and it
 * lifts on hover like the ride-request cards.
 */
type CardTone = {
  bg: string; // deep card background
  circle: string; // even darker icon disc
  icon: string; // light accent (icon fill)
  title: string; // light same-hue title
  sub: string; // softer same-hue subtitle
};

// Mirrors the ride-request cards: vibrant app colour, icon in a dark disc tinted
// with the card's colour, bold text toned to the card. The deep-green card uses
// bright lime text (never white) — the same rule wherever a green card appears.
const TONES = {
  chat: { bg: "#14392a", circle: "#0b2b1b", icon: "#9fe870", title: "#9fe870", sub: "#a9d4b0" },
  report: { bg: "#d4b896", circle: "#0e0e0e", icon: "#d4b896", title: "#0e0e0e", sub: "#5c4e3b" },
  call: { bg: "#9fe870", circle: "#14392a", icon: "#9fe870", title: "#14392a", sub: "#3f5722" },
  email: { bg: "#9ec5a2", circle: "#0e0e0e", icon: "#9ec5a2", title: "#0e0e0e", sub: "#2f4a38" },
} as const satisfies Record<string, CardTone>;

const ContactGrid = styled(Reveal)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
  gap: 20px;
`;

/* Shared look for the contact cards. Used by both a <button> and an <a>. */
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
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.4);
  }
`;

/* Title + subtitle sit at the bottom, icon at the top — same rhythm as the
   ride-request cards. */
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

const IconWell = styled.span<{ $tone: CardTone }>`
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: ${({ $tone }) => $tone.circle};
  display: grid;
  place-items: center;
  flex: none;

  svg {
    fill: ${({ $tone }) => $tone.icon};
  }
`;

const CardTitle = styled.b<{ $tone: CardTone }>`
  font-weight: 800;
  font-size: 23px;
  line-height: 1.1;
  color: ${({ $tone }) => $tone.title};
  letter-spacing: -0.02em;
`;

const CardText = styled.small<{ $tone: CardTone }>`
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: ${({ $tone }) => $tone.sub};
`;

const phone = "+254700000000";

/**
 * Contact cards + the floating support dock, sharing open state so the
 * "Live chat" and "Report an issue" cards can launch the dock in the right mode.
 */
export function ContactDock() {
  const [signal, setSignal] = useState<{ mode: "support" | "report"; nonce: number }>();

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
          <IconWell $tone={TONES.chat}>
            <svg width="28" height="28" viewBox="0 0 256 256" aria-hidden>
              <path d="M216,48H40A16,16,0,0,0,24,64V224a15.85,15.85,0,0,0,9.24,14.5A16.13,16.13,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78l.09-.07L83,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM96,140a12,12,0,1,1,12-12A12,12,0,0,1,96,140Zm32,0a12,12,0,1,1,12-12A12,12,0,0,1,128,140Zm32,0a12,12,0,1,1,12-12A12,12,0,0,1,160,140Z" />
            </svg>
          </IconWell>
          <CardBody>
            <CardTitle $tone={TONES.chat}>Live chat</CardTitle>
            <CardText $tone={TONES.chat}>Talk to support now. Average reply under two minutes.</CardText>
          </CardBody>
        </ContactCardButton>

        <ContactCardButton
          type="button"
          $tone={TONES.report}
          onClick={() => open("report")}
        >
          <IconWell $tone={TONES.report}>
            <svg width="28" height="28" viewBox="0 0 256 256" aria-hidden>
              <path d="M232,56v90.85c0,9.31-5.15,17.82-13.44,22.21-9.85,5.21-25.32,11-45.6,11-13.09,0-27.96-2.42-44.44-9.19C97.72,158.6,71.66,164,56,169.09V216a8,8,0,0,1-16,0V56a8,8,0,0,1,3.2-6.4C44.36,48.72,71.65,29,111.11,45.19c33,13.55,58.24,7.4,72.42-.1C199.53,36.65,218.24,42.4,232,56Z" />
            </svg>
          </IconWell>
          <CardBody>
            <CardTitle $tone={TONES.report}>Report an issue</CardTitle>
            <CardText $tone={TONES.report}>Something went wrong on a trip? Flag it and we investigate.</CardText>
          </CardBody>
        </ContactCardButton>

        <ContactCardLink href={`tel:${phone}`} $tone={TONES.call}>
          <IconWell $tone={TONES.call}>
            <svg width="28" height="28" viewBox="0 0 256 256" aria-hidden>
              <path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46Z" />
            </svg>
          </IconWell>
          <CardBody>
            <CardTitle $tone={TONES.call}>Call us</CardTitle>
            <CardText $tone={TONES.call}>+254 700 000 000 · Mon–Sun, 6am to 11pm EAT.</CardText>
          </CardBody>
        </ContactCardLink>

        <ContactCardLink href="mailto:hello@kipita.co.ke" $tone={TONES.email}>
          <IconWell $tone={TONES.email}>
            <svg width="28" height="28" viewBox="0 0 256 256" aria-hidden>
              <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z" />
            </svg>
          </IconWell>
          <CardBody>
            <CardTitle $tone={TONES.email}>Email</CardTitle>
            <CardText $tone={TONES.email}>hello@kipita.co.ke · we answer within a working day.</CardText>
          </CardBody>
        </ContactCardLink>
      </ContactGrid>

      <SupportDock openSignal={signal} />
    </>
  );
}
