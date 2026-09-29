"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { CaretLeft, CaretRight } from "@/components/icons";
import { WEATHER_ICON, formatTemp } from "@/lib/places/meta";
import { cityGradient, cityInitial } from "@/lib/places/photo";
import type { Destination } from "@/lib/places/destinations";

/**
 * Trip ideas: somewhere to go, rather than a ride to take.
 *
 * Photo-led portrait cards with the place and its county set over the image,
 * and a scroll control that sits on the edge of the rail rather than above it.
 * Each card links into a search with the destination filled in, so the section
 * ends in a ride instead of a dead end.
 */

const Block = styled.section`
  display: grid;
  gap: 18px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.type.heading};
  font-weight: 600;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.color.onSurface};
`;

const Group = styled.div`
  display: grid;
  gap: 10px;
`;

const Head = styled.header`
  display: grid;
  gap: 1px;

  h3 {
    margin: 0;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 700;
    letter-spacing: -0.015em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 0;
    font-size: ${({ theme }) => theme.type.label};
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const Frame = styled.div`
  position: relative;
`;

const Rail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - 5 * 12px) / 6);
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
  > * {
    scroll-snap-align: start;
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 4px;
    border-radius: ${({ theme }) => theme.radius.sm};
  }

  @media (max-width: 1199px) {
    grid-auto-columns: calc((100% - 4 * 12px) / 5);
  }
  @media (max-width: 999px) {
    grid-auto-columns: calc((100% - 3 * 12px) / 4);
  }
  @media (max-width: 767px) {
    grid-auto-columns: calc((100% - 2 * 12px) / 3);
  }
  @media (max-width: 539px) {
    grid-auto-columns: 46%;
  }
  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
  }
`;

/** Sits on the edge of the rail, half over the last card, as the reference does. */
const Nudge = styled.button<{ $side: "start" | "end" }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === "start" ? "left: -14px;" : "right: -14px;")}
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.inverseSurface};
  color: ${({ theme }) => theme.color.inverseOnSurface};
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  z-index: 2;

  &:hover {
    opacity: 0.9;
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }

  @media (max-width: 767px) {
    display: none;
  }
`;

const Card = styled(Link)<{ $from: string; $to: string }>`
  position: relative;
  display: flex;
  align-items: flex-end;
  aspect-ratio: 5 / 7;
  min-height: 180px;
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  text-decoration: none;
  background: linear-gradient(135deg, ${({ $from }) => $from}, ${({ $to }) => $to});

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }
  &:hover img {
    transform: scale(1.06);
  }

  .monogram {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 84px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.16);
    line-height: 1;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.3) 0%,
      rgba(0, 0, 0, 0) 38%,
      rgba(0, 0, 0, 0.86) 100%
    );
  }

  .copy {
    position: relative;
    padding: 12px;
    min-width: 0;
    color: #fff;
  }
  .name {
    display: block;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .region {
    display: block;
    margin-top: 2px;
    font-size: ${({ theme }) => theme.type.micro};
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.82);
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    img,
    &:hover img {
      transition: none;
      transform: none;
    }
  }
`;

const WeatherChip = styled.span`
  position: absolute;
  top: 9px;
  right: 9px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: ${({ theme }) => theme.type.micro};
  font-weight: 600;

  svg {
    flex: none;
  }
`;

export function DestinationsBand({ items }: { items: Destination[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    sync();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync, items.length]);

  function nudge(direction: -1 | 1) {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85 * direction });
  }

  if (items.length === 0) return null;

  return (
    <Block aria-labelledby="trip-ideas">
      <Title id="trip-ideas">Trip ideas</Title>

      <Group>
        <Head>
          <h3>Destinations worth exploring</h3>
          <p>Places to go next, picked from the routes you travel.</p>
        </Head>

        <Frame>
          {!atStart && (
            <Nudge
              type="button"
              $side="start"
              onClick={() => nudge(-1)}
              aria-label="Previous destinations"
            >
              <CaretLeft size={18} />
            </Nudge>
          )}

          <Rail
            ref={railRef}
            tabIndex={0}
            role="group"
            aria-label="Destinations worth exploring. Scroll horizontally."
          >
            {items.map((d) => {
              const [from, to] = cityGradient(d.town);
              const Weather = d.weather ? WEATHER_ICON[d.weather.kind] : null;
              return (
                <Card
                  key={d.town}
                  href={`/home?to=${encodeURIComponent(d.town)}`}
                  $from={from}
                  $to={to}
                  title={d.reason}
                  aria-label={`${d.town}, ${d.region}. ${d.reason}`}
                >
                  {d.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.photo} alt="" loading="lazy" />
                  ) : (
                    <span className="monogram" aria-hidden="true">
                      {cityInitial(d.town)}
                    </span>
                  )}
                  <span className="scrim" />

                  {d.weather && Weather && (
                    <WeatherChip title={d.weather.label}>
                      <Weather size={13} />
                      {formatTemp(d.weather.tempC)}
                    </WeatherChip>
                  )}

                  <span className="copy">
                    <span className="name">{d.town}</span>
                    <span className="region">{d.region}</span>
                  </span>
                </Card>
              );
            })}
          </Rail>

          {!atEnd && (
            <Nudge
              type="button"
              $side="end"
              onClick={() => nudge(1)}
              aria-label="More destinations"
            >
              <CaretRight size={18} />
            </Nudge>
          )}
        </Frame>
      </Group>
    </Block>
  );
}
