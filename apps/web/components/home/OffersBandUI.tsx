"use client";

import styled from "styled-components";
import { SealPercent, CalendarDots, Gift } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import type { ToneName } from "@/lib/theme";
import { formatPromotionValue, isLive, type Promotion } from "@/lib/promotions";

type Palette = "green" | "sage" | "lime" | "plain";

const PALETTE: Record<Palette, { bg: string; fg: string }> = {
  green: { bg: nocturne.green, fg: nocturne.onGreen },
  sage: { bg: nocturne.sage, fg: nocturne.greenDeep },
  lime: { bg: nocturne.lime, fg: nocturne.greenDeep },
  plain: { bg: nocturne.surface3, fg: nocturne.cream },
};

const TONE_TO_PALETTE: Partial<Record<ToneName, Palette>> = {
  green: "green",
  forest: "green",
  deep: "green",
  jungle: "green",
  dark: "green",
  mint: "sage",
  blue: "sage",
  lav: "sage",
  lilac: "sage",
  lime: "lime",
  amber: "lime",
  peach: "lime",
  tan: "lime",
  surface: "plain",
};

const ROTATION: Palette[] = ["green", "sage", "lime"];

const Head = styled.h2`
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${nocturne.cream};
`;

const Rail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(min(250px, 82%), 1fr);
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 18px;
  padding: 0 18px 2px;
  margin-inline: -18px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  > * {
    scroll-snap-align: start;
  }

  @media (min-width: 720px) {
    padding-inline: 0;
    margin-inline: 0;
    grid-auto-flow: row;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    grid-auto-columns: auto;
    overflow-x: visible;
  }
`;

const Card = styled.article<{ $palette: Palette }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 20px;
  border-radius: 20px;
  background: ${({ $palette }) => PALETTE[$palette].bg};
  color: ${({ $palette }) => PALETTE[$palette].fg};

  .value {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .ends {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    font-size: 13px;
    font-weight: 700;
  }
`;

function endsOn(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function OffersBandUI({ offers }: { offers: Promotion[] }) {
  const live = offers.filter((offer) => isLive(offer));
  if (live.length === 0) return null;

  return (
    <section>
      <Head>Offers for you</Head>
      <Rail>
        {live.map((offer, i) => {
          const palette = TONE_TO_PALETTE[offer.tone as ToneName] ?? ROTATION[i % ROTATION.length];
          const Icon = offer.kind === "gift_card" ? Gift : SealPercent;
          return (
            <Card key={offer.id} $palette={palette}>
              <span className="value">
                <Icon size={21} aria-hidden />
                {formatPromotionValue(offer)}
              </span>
              <h3>{offer.title}</h3>
              {offer.blurb ? <p>{offer.blurb}</p> : null}
              {offer.ends_at ? (
                <span className="ends">
                  <CalendarDots size={14} aria-hidden /> Ends {endsOn(offer.ends_at)}
                </span>
              ) : null}
            </Card>
          );
        })}
      </Rail>
    </section>
  );
}
