"use client";

import { useState } from "react";
import styled, { useTheme } from "styled-components";
import { SealPercent as BadgePercent, CalendarDots as CalendarClock, Check, Copy, Gift } from "@/components/icons";
import type { ToneName } from "@/lib/theme";
import {
  formatPromotionValue,
  isLive,
  type Promotion,
} from "@/lib/promotions";

const Head = styled.h2`
  margin: 0 0 12px;
  font-size: ${({ theme }) => theme.type.subhead};
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.text};
`;

const Rail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(250px, 1fr);
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  > * {
    scroll-snap-align: start;
  }

  @media (min-width: 720px) {
    grid-auto-flow: row;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    grid-auto-columns: auto;
    overflow-x: visible;
  }
`;

const Card = styled.article<{ $tone: ToneName }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $tone }) => theme.tone[$tone].bg};
  color: ${({ theme, $tone }) => theme.tone[$tone].on};

  .value {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: ${({ theme }) => theme.type.heading};
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  h3 {
    margin: 0;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 700;
  }
  p {
    margin: 0;
    font-size: ${({ theme }) => theme.type.label};
    line-height: 1.5;
    opacity: 0.84;
  }
  .ends {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    font-size: ${({ theme }) => theme.type.label};
    font-weight: 700;
    opacity: 0.74;
  }
`;

const CodeRow = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  margin-top: 6px;
  padding: 7px 13px;
  border: 1.5px dashed currentColor;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  opacity: 0.92;

  &:hover {
    opacity: 1;
  }
`;

const FALLBACK_TONE: ToneName = "green";

/**
 * Band 3 — live offers.
 *
 * `tone` is a free-text column with a CHECK constraint behind it (migration
 * 018); the guard here is belt-and-braces so a tone added to the DB before the
 * theme can't crash the page on `theme.tone[undefined].bg`.
 */
export function OffersBandUI({ offers }: { offers: Promotion[] }) {
  const theme = useTheme();
  const [copied, setCopied] = useState<string | null>(null);

  // The server render can be a few minutes stale; re-check the window here so a
  // just-expired offer doesn't linger in a cached payload.
  const live = offers.filter((offer) => isLive(offer));
  if (live.length === 0) return null;

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard denied — the code is on screen anyway.
    }
  }

  return (
    <section>
      <Head>Offers for you</Head>
      <Rail>
        {live.map((offer) => {
          const tone = offer.tone in theme.tone ? offer.tone : FALLBACK_TONE;
          const Icon = offer.kind === "gift_card" ? Gift : BadgePercent;
          const ends = offer.ends_at
            ? new Date(offer.ends_at).toLocaleDateString("en-KE", {
                day: "numeric",
                month: "short",
              })
            : null;

          return (
            <Card key={offer.id} $tone={tone}>
              <span className="value">
                <Icon size={21} />
                {formatPromotionValue(offer)}
              </span>
              <h3>{offer.title}</h3>
              <p>{offer.blurb}</p>
              {offer.code && (
                <CodeRow
                  type="button"
                  onClick={() => void copy(offer.code as string)}
                  aria-label={`Copy code ${offer.code}`}
                >
                  {copied === offer.code ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                  {offer.code}
                </CodeRow>
              )}
              {ends && (
                <span className="ends">
                  <CalendarClock size={13} /> Ends {ends}
                </span>
              )}
            </Card>
          );
        })}
      </Rail>
    </section>
  );
}
