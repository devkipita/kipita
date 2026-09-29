"use client";

import Link from "next/link";
import styled from "styled-components";
import { ArrowRight } from "@/components/icons";
import { HOME_COPY } from "@/lib/home/copy";
import { PROMOS, type Promo } from "@/lib/home/promos";
import type { ToneName } from "@/lib/theme";

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
  grid-auto-columns: minmax(268px, 1fr);
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

  @media (min-width: 760px) {
    grid-auto-flow: row;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    grid-auto-columns: auto;
    overflow-x: visible;
  }
`;

const Card = styled(Link)<{ $tone: ToneName }>`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $tone }) => theme.tone[$tone].bg};
  color: ${({ theme, $tone }) => theme.tone[$tone].on};
  text-decoration: none;
  transition: transform 0.18s ease;

  &:hover {
    transform: translateY(-3px);
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const Top = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;

  .copy {
    flex: 1;
    min-width: 0;
  }
  small {
    display: block;
    font-size: ${({ theme }) => theme.type.micro};
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    opacity: 0.75;
  }
  b {
    display: block;
    margin-top: 5px;
    font-size: ${({ theme }) => theme.type.subhead};
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  p {
    margin: 7px 0 0;
    font-size: ${({ theme }) => theme.type.label};
    line-height: 1.45;
    opacity: 0.82;
  }
`;

const Emblem = styled.span<{ $tone: ToneName }>`
  display: grid;
  place-items: center;
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $tone }) => theme.tone[$tone].on};
  color: ${({ theme, $tone }) => theme.tone[$tone].bg};
`;

const Cta = styled.span<{ $tone: ToneName }>`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $tone }) => theme.tone[$tone].on};
  color: ${({ theme, $tone }) => theme.tone[$tone].bg};
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
`;

function PromoCard({ promo }: { promo: Promo }) {
  const Icon = promo.icon;
  return (
    <Card href={promo.href} $tone={promo.tone}>
      <Top>
        <span className="copy">
          <small>{promo.eyebrow}</small>
          <b>{promo.headline}</b>
          <p>{promo.body}</p>
        </span>
        <Emblem $tone={promo.tone}>
          <Icon size={24} />
        </Emblem>
      </Top>
      <Cta $tone={promo.tone}>
        {promo.cta}
        <ArrowRight size={14} />
      </Cta>
    </Card>
  );
}

export function PromoBand() {
  return (
    <section>
      <Head>{HOME_COPY.promosTitle}</Head>
      <Rail>
        {PROMOS.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
      </Rail>
    </section>
  );
}
