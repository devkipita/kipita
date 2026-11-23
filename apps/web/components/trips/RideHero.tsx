"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import styled, { keyframes } from "styled-components";
import { AnimatePresence, m } from "motion/react";
import { RollingNumber } from "@/components/ui/Counter";
import { tween } from "@/lib/motion";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import type { PublishedTrip } from "@/lib/trips/types";
import { SeatMap } from "./SeatMap";

const CAR_W = 52;

const drive = keyframes`
  0% { transform: translateX(calc(-100% + ${CAR_W}px)); opacity: 0; }
  8% { opacity: 1; }
  82% { transform: translateX(0); opacity: 1; }
  92%, 100% { transform: translateX(0); opacity: 0; }
`;

const Card = styled.article`
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  grid-template-areas:
    "band band"
    "seats details";
  overflow: hidden;
  border-radius: 24px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  color: ${nocturne.cream};

  @media (max-width: 600px) {
    border-radius: 20px;
  }

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "band"
      "details"
      "seats";
  }
`;

const Band = styled.div<{ $running: boolean }>`
  grid-area: band;
  display: grid;
  gap: 20px;
  padding: 24px 28px 20px;
  background: ${({ $running }) => ($running ? nocturne.greenDeep : nocturne.green)};
  color: ${nocturne.onGreen};

  @media (max-width: 860px) {
    gap: 12px;
    padding: 16px;
  }
`;

const Top = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
`;

const When = styled.div`
  display: grid;
  gap: 4px;

  .time {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 44px;
    font-weight: 800;
    line-height: 48px;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.lime};
  }
  .day {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    color: ${nocturne.onGreenMuted};
  }

  @media (max-width: 600px) {
    width: 100%;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;

    .time {
      font-size: 36px;
      line-height: 40px;
    }
    .day {
      justify-content: flex-end;
      font-size: 14px;
    }
  }
`;

const Timer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  svg.ring {
    flex: none;
    transform: rotate(-90deg);
  }
  .ring .track {
    stroke: color-mix(in oklab, var(--n-on-green) 18%, transparent);
  }
  .ring .fill {
    stroke: ${nocturne.lime};
    transition: stroke-dashoffset ${dur.enter} ${ease.standard};
  }
  .lead {
    display: block;
    font-size: 14px;
    color: ${nocturne.onGreenMuted};
  }
  .units {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .unit {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    font-size: 14px;
    color: ${nocturne.onGreenMuted};
  }
  .unit b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 28px;
    font-weight: 800;
    line-height: 32px;
    color: ${nocturne.onGreen};
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 600px) {
    gap: 12px;

    svg.ring {
      width: 44px;
      height: 44px;
    }
    .lead {
      font-size: 13px;
    }
    .unit b {
      font-size: 22px;
      line-height: 28px;
    }
  }
`;

const Route = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;

  .town {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .to {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  @media (max-width: 600px) {
    font-size: 17px;
    gap: 12px;
  }
`;

const Road = styled.div`
  position: relative;
  height: 32px;
  min-width: 80px;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    margin-top: -1px;
    background-image: linear-gradient(90deg, ${nocturne.lime} 0 12px, transparent 12px 24px);
    background-size: 24px 2px;
  }
  .end {
    position: absolute;
    top: 50%;
    width: 12px;
    height: 12px;
    transform: translateY(-50%);
    border-radius: 50%;
    background: ${nocturne.lime};
  }
  .end.from {
    left: -6px;
  }
  .end.to-dot {
    right: -6px;
    box-shadow: 0 0 0 4px color-mix(in oklab, ${nocturne.lime} 30%, transparent);
  }
  .lane {
    position: absolute;
    inset: 0;
    animation: ${drive} calc(${dur.max} * 14) ${ease.standard} infinite;
  }
  .car {
    position: absolute;
    right: 0;
    top: 50%;
    width: ${CAR_W}px;
    height: 24px;
    margin-top: -12px;
  }
  .car img {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 24px !important;
    height: 52px !important;
    transform: translate(-50%, -50%) rotate(90deg);
  }

  @media (prefers-reduced-motion: reduce) {
    .lane {
      animation: none;
      transform: translateX(calc(-50% + ${CAR_W / 2}px));
    }
  }
`;

const Seats = styled.div`
  grid-area: seats;
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 12px;
  padding: 24px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  @media (max-width: 600px) {
    padding: 16px 12px;
  }

  .booked {
    justify-self: stretch;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 14px;
    color: ${nocturne.muted};
  }
  .booked b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
`;

const Details = styled.div`
  grid-area: details;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 24px 28px;

  @media (max-width: 860px) {
    gap: 12px;
    padding: 12px;
  }
`;

const Tiles = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 8px;

  > div {
    display: grid;
    align-content: start;
    gap: 4px;
    padding: 12px 16px;
    border-radius: 16px;
  }
  .car-tile {
    background: ${({ theme }) => theme.tone.blue.bg};
    color: ${({ theme }) => theme.tone.blue.on};
  }
  .price-tile {
    background: ${({ theme }) => theme.tone.amber.bg};
    color: ${({ theme }) => theme.tone.amber.on};
  }
  .label {
    font-size: 13px;
    font-weight: 600;
    opacity: 0.8;
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
    font-weight: 800;
    line-height: 28px;
  }
  @media (max-width: 600px) {
    > div {
      padding: 8px 12px;
      border-radius: 12px;
    }
    b {
      font-size: 17px;
      line-height: 24px;
    }
  }
  .plate {
    justify-self: start;
    margin-top: 4px;
    padding: 2px 8px;
    border-radius: 6px;
    background: ${nocturne.surface};
    color: ${nocturne.cream};
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
`;

const Live = styled(m.div)`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 4px 12px;
  border-radius: 12px;
  background: ${({ theme }) => theme.color.successContainer};
  color: ${({ theme }) => theme.color.onSuccessContainer};
  font-size: 14px;
  font-weight: 600;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
`;

function Countdown({ ms, lead, progress }: { ms: number; lead: string; progress: number }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const units =
    days > 0
      ? [
          { key: "d", value: days, label: "d" },
          { key: "h", value: hours, label: "h" },
          { key: "m", value: mins, label: "min" },
        ]
      : [
          { key: "h", value: hours, label: "h" },
          { key: "m", value: mins, label: "min" },
          { key: "s", value: secs, label: "s" },
        ].filter((u, i) => u.key !== "h" || hours > 0 || i > 0);
  const spoken = units.map((u) => `${u.value} ${u.label}`).join(" ");
  const r = 24;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));

  return (
    <Timer role="timer" aria-label={`${lead} ${spoken}`}>
      <svg className="ring" width="60" height="60" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
        <circle className="track" cx="30" cy="30" r={r} fill="none" strokeWidth="6" />
        <circle
          className="fill"
          cx="30"
          cy="30"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
        />
      </svg>
      <div aria-hidden>
        <span className="lead">{lead}</span>
        <span className="units">
          {units.map((u) => (
            <span key={u.key} className="unit">
              <b>
                <RollingNumber value={u.value} duration={u.key === "s" ? 400 : 900} />
              </b>
              {u.label}
            </span>
          ))}
        </span>
      </div>
    </Timer>
  );
}

export function RideHero({
  trip,
  running,
  status,
  countdown,
  news,
  actions,
  busy,
}: {
  trip: PublishedTrip;
  running: boolean;
  status: ReactNode;
  countdown: { ms: number; lead: string; progress: number } | null;
  news: { key: string; text: string } | null;
  actions: ReactNode;
  busy?: ReactNode;
}) {
  const booked = trip.paid_seats + trip.awaiting_payment;
  const car = trip.vehicle ? [trip.vehicle.make, trip.vehicle.model].filter(Boolean).join(" ") : "";

  return (
    <Card aria-label={`${trip.from_location} to ${trip.to_location}`}>
      <Band $running={running}>
        <Top>
          <When>
            <span className="time">{formatTripTime(trip.departure_time) || "Time to confirm"}</span>
            <span className="day">
              {formatTripDate(trip.departure_date) || "Date to confirm"}
              {status}
            </span>
          </When>
          {countdown && <Countdown {...countdown} />}
        </Top>

        <Route>
          <span className="town">{trip.from_location}</span>
          <Road aria-hidden>
            <span className="end from" />
            <span className="lane">
              <span className="car">
                <Image src="/map/car.svg" alt="" width={24} height={52} unoptimized />
              </span>
            </span>
            <span className="end to-dot" />
          </Road>
          <span className="to"> to </span>
          <span className="town">{trip.to_location}</span>
        </Route>
      </Band>

      <Details>
        <Tiles>
          <div className="car-tile">
            <span className="label">Car</span>
            <b>{car || "Car to add"}</b>
            {trip.vehicle?.plate_number && <span className="plate">{trip.vehicle.plate_number}</span>}
          </div>
          <div className="price-tile">
            <span className="label">A seat</span>
            <b>{formatCurrency(trip.price_per_seat)}</b>
          </div>
        </Tiles>

        <AnimatePresence initial={false}>
          {news && (
            <Live
              key={news.key}
              role="status"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: tween.enter }}
              exit={{ opacity: 0, transition: tween.exit }}
            >
              <span className="dot" aria-hidden />
              {news.text}
            </Live>
          )}
        </AnimatePresence>

        {actions}
        {busy}
      </Details>

      <Seats>
        <span className="booked">
          Seats
          <span>
            <b>
              <RollingNumber value={booked} />
            </b>{" "}
            of {trip.seats_total} booked
          </span>
        </span>
        <SeatMap
          total={trip.seats_total}
          paid={trip.paid_seats}
          booked={trip.awaiting_payment}
          requested={trip.pending_requests}
          riders={trip.riders}
        />
      </Seats>
    </Card>
  );
}

