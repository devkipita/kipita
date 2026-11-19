"use client";

import { useRef, type MouseEvent } from "react";
import Link from "next/link";
import styled, { css, keyframes } from "styled-components";
import { ArrowRight, Car, SealCheck, Star } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { Shimmer } from "@/components/ui/Shimmer";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatKes } from "@/lib/rides";
import { formatRideTime } from "@/lib/ride-detail";
import { useMorphNavigate } from "@/lib/ui/viewTransition";
import type { HomeTrip } from "@/lib/home/search";

const LINE = {
  clock: 24,
  place: 24,
  day: 20,
  name: 22,
  meta: 20,
  car: 20,
  amount: 28,
  small: 18,
  view: 44,
};

const STAGGER = [0, 40, 76, 109, 139];

const rise = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
`;

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const RideList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 13px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Item = styled.li<{ $order: number | null }>`
  position: relative;
  min-width: 0;

  ${({ $order }) =>
    $order === null
      ? ""
      : css`
          animation: ${rise} ${dur.enter} ${ease.enter} both;
          animation-delay: ${STAGGER[$order]}ms;

          @media (prefers-reduced-motion: reduce) {
            animation-name: ${fade};
            animation-delay: 0ms;
          }
        `}
`;

const shell = css`
  position: relative;
  display: grid;
  grid-template-columns: 1.5fr 1.15fr 0.8fr;
  align-items: center;
  gap: 25px;
  padding: 26px;
  border-radius: 20px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.cardBorder};

  @media (max-width: 960px) {
    grid-template-columns: 1.4fr 1fr 0.8fr;
    gap: 16px;
  }
  @media (max-width: 700px) {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 18px;
    padding: 22px 18px;
  }
`;

const Body = styled.article`
  ${shell}
  box-shadow: ${nocturne.cardShadow};
  cursor: pointer;
  transition:
    border-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.accent};
    }
  }
  &:active {
    transform: scale(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const Route = styled.div`
  display: flex;
  gap: 12px;
  min-width: 0;

  @media (max-width: 700px) {
    grid-column: 1 / -1;
    padding-bottom: 16px;
    border-bottom: 1px solid ${nocturne.line};
  }
`;

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: none;
  width: 12px;
  padding: 7px 0;

  i {
    flex: none;
    width: 10px;
    height: 10px;
    border: 2px solid ${nocturne.ctaBg};
    border-radius: 50%;
    background: ${nocturne.surface};
  }
  i:last-child {
    border-color: ${nocturne.accent};
  }
  span {
    flex: 1;
    width: 1px;
    min-height: 26px;
    background: ${nocturne.line};
  }
`;

const Times = styled.div`
  flex: 1;
  min-width: 0;

  .leg {
    display: grid;
    grid-template-columns: 84px minmax(0, 1fr);
    gap: 10px;
    align-items: baseline;
  }
  .clock {
    font-family: var(--font-manrope), inherit;
    font-size: 17px;
    line-height: ${LINE.clock}px;
    font-weight: 700;
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .place {
    min-width: 0;
    font-size: 16px;
    line-height: ${LINE.place}px;
    color: ${nocturne.cream};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .day {
    display: block;
    margin: 8px 0 8px 94px;
    font-size: 14px;
    line-height: ${LINE.day}px;
    color: ${nocturne.muted2};
  }
`;

const Driver = styled.div`
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  min-width: 0;

  .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 16px;
    line-height: ${LINE.name}px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .name span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name svg {
    flex: none;
    color: ${nocturne.accent};
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    font-size: 14px;
    line-height: ${LINE.meta}px;
    color: ${nocturne.muted2};
    white-space: nowrap;
  }
  .meta svg {
    color: ${nocturne.star};
  }
  .new {
    padding: 0 8px;
    border-radius: 999px;
    background: ${nocturne.surface2};
    color: ${nocturne.accent};
    font-size: 12px;
    font-weight: 700;
  }
  .car {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    font-size: 14px;
    line-height: ${LINE.car}px;
    color: ${nocturne.muted2};
  }
  .car span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 700px) {
    grid-column: 1;
    .car {
      display: none;
    }
  }
`;

const Price = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;

  .amount {
    font-family: var(--font-manrope), inherit;
    font-size: 22px;
    line-height: ${LINE.amount}px;
    font-weight: 800;
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .per,
  .seats {
    font-size: 13px;
    line-height: ${LINE.small}px;
    color: ${nocturne.muted2};
    white-space: nowrap;
  }

  @media (max-width: 700px) {
    grid-column: 2;
    grid-row: 2;
  }
`;

const View = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: ${LINE.view}px;
  margin-top: 6px;
  padding: 0 18px;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.greenDeep};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

function tripDay(date: string | null) {
  if (!date) return "Flexible date";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

function vehicleLabel(t: HomeTrip) {
  const v = t.vehicle;
  const parts = [v?.color, v?.make, v?.model].filter(Boolean);
  return parts.length ? parts.join(" ") : "Verified ride";
}

export function isNewDriver(t: HomeTrip) {
  return !(Number(t.person?.total_trips ?? 0) > 0) || !(Number(t.person?.rating ?? 0) > 0);
}

function plainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function RideCard({ trip, order }: { trip: HomeTrip; order: number | null }) {
  const cardRef = useRef<HTMLElement>(null);
  const morph = useMorphNavigate();
  const href = `/ride/${trip.id}`;
  const name = trip.person?.full_name?.trim() || "Kipita driver";
  const fresh = isNewDriver(trip);
  const vehicle = vehicleLabel(trip);
  const kes = formatKes(trip.price_per_seat);

  function open(e: MouseEvent) {
    e.preventDefault();
    morph(href, cardRef.current);
  }

  return (
    <Item $order={order}>
      <Body
        ref={cardRef}
        data-ride-card
        aria-label={`${trip.from_location} to ${trip.to_location}, ${kes} per seat`}
        onClick={(e) => {
          if (!plainClick(e)) return;
          if ((e.target as HTMLElement).closest("a,button")) return;
          if (window.getSelection()?.toString()) return;
          open(e);
        }}
      >
        <Route>
          <Timeline aria-hidden>
            <i />
            <span />
            <i />
          </Timeline>
          <Times>
            <div className="leg">
              <span className="clock">{formatRideTime(trip.departure_time) ?? "Any time"}</span>
              <span className="place" title={trip.from_location}>
                {trip.from_location}
              </span>
            </div>
            <span className="day">{tripDay(trip.departure_date)}</span>
            <div className="leg">
              <span className="clock" aria-hidden />
              <span className="place" title={trip.to_location}>
                {trip.to_location}
              </span>
            </div>
          </Times>
        </Route>

        <Driver>
          <span aria-hidden>
            <Avatar name={name} src={trip.person?.avatar_url} size={46} />
          </span>
          <span className="who">
            <span className="name">
              <span title={name}>{name}</span>
              {trip.person?.is_verified && <SealCheck size={16} aria-label="Verified driver" />}
            </span>
            <span className="meta">
              {fresh ? (
                <span className="new">New</span>
              ) : (
                <>
                  <Star size={14} weight="fill" aria-hidden />
                  {Number(trip.person?.rating).toFixed(1)} · {trip.person?.total_trips} trips
                </>
              )}
            </span>
          </span>
          <span className="car">
            <Car size={16} aria-hidden />
            <span title={vehicle}>{vehicle}</span>
          </span>
        </Driver>

        <Price>
          <span className="amount">{kes}</span>
          <span className="per">per seat</span>
          <span className="seats">
            {trip.seats_available} {trip.seats_available === 1 ? "seat" : "seats"} left
          </span>
          <View
            href={href}
            onClick={(e) => {
              if (plainClick(e)) open(e);
            }}
            aria-label={`View ride from ${trip.from_location} to ${trip.to_location}`}
          >
            View ride <ArrowRight size={16} aria-hidden />
          </View>
        </Price>
      </Body>
    </Item>
  );
}

const SkeletonBody = styled.div`
  ${shell}
`;

const Line = styled.span<{ $h: number }>`
  display: flex;
  align-items: center;
  width: 100%;
  height: ${({ $h }) => $h}px;
  min-width: 0;
`;

function Bar({ h, w, r }: { h: number; w: string; r?: string }) {
  return (
    <Line $h={h}>
      <Shimmer $h={`${Math.round(h * 0.62)}px`} $w={w} $r={r} />
    </Line>
  );
}

const SkTimes = styled.div`
  flex: 1;
  min-width: 0;

  .gap {
    height: 8px;
  }
`;

const SkWho = styled.span`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const SkPrice = styled(Price)`
  min-width: 122px;

  ${Line} {
    justify-content: flex-end;
  }
  .view {
    margin-top: 6px;
  }
`;

export function RideCardSkeleton() {
  return (
    <li aria-hidden>
      <SkeletonBody>
        <Route>
          <Timeline>
            <i />
            <span />
            <i />
          </Timeline>
          <SkTimes>
            <Bar h={LINE.clock} w="72%" />
            <div className="gap" />
            <Bar h={LINE.day} w="44%" />
            <div className="gap" />
            <Bar h={LINE.place} w="56%" />
          </SkTimes>
        </Route>
        <Driver>
          <Shimmer $w="46px" $h="46px" $r="50%" />
          <SkWho>
            <Bar h={LINE.name} w="78%" />
            <Bar h={LINE.meta} w="52%" />
          </SkWho>
          <span className="car">
            <Bar h={LINE.car} w="64%" />
          </span>
        </Driver>
        <SkPrice>
          <Bar h={LINE.amount} w="96px" />
          <Bar h={LINE.small} w="56px" />
          <Bar h={LINE.small} w="72px" />
          <span className="view">
            <Shimmer $w="122px" $h={`${LINE.view}px`} $r="999px" />
          </span>
        </SkPrice>
      </SkeletonBody>
    </li>
  );
}

export function RideListSkeleton({ count = 6, label = "Loading rides" }: { count?: number; label?: string }) {
  return (
    <RideList aria-busy="true" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <RideCardSkeleton key={i} />
      ))}
    </RideList>
  );
}
