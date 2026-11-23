"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import styled from "styled-components";
import { AnimatePresence, m } from "motion/react";
import { Clock } from "@/components/icons";
import { RollingNumber } from "@/components/ui/Counter";
import { tween } from "@/lib/motion";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import type { PublishedTrip } from "@/lib/trips/types";
import { SeatMap } from "./SeatMap";
import { RouteMap } from "./RouteMap";
import { useTripLocation } from "@/lib/trips/live";
import type { TripRoute } from "@/lib/maps/types";

const MINI_PAD = { top: 32, right: 32, bottom: 32, left: 32 };

const Card = styled.article<{ $window: boolean; $running: boolean }>`
  display: grid;
  grid-template-columns: ${({ $window, $running }) =>
    $window ? `minmax(0, 1fr) minmax(${$running ? "240px, 44%" : "280px, 40%"})` : "minmax(0, 1fr)"};
  grid-template-areas: ${({ $window }) => ($window ? `"info win" "acts win"` : `"info" "acts"`)};
  grid-template-rows: 1fr auto;
  gap: 0 8px;
  padding: 8px;
  border-radius: 24px;
  background: ${nocturne.greenDeep};
  color: ${nocturne.onGreen};

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: ${({ $window }) => ($window ? `"info" "win" "acts"` : `"info" "acts"`)};
    grid-template-rows: auto;
    border-radius: 20px;
  }
`;

const Info = styled.div`
  grid-area: info;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
  padding: 20px 20px 24px;

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .title {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  h3 {
    margin: 0;
    overflow: hidden;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(16px, 6cqi, 28px);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.03em;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .facts {
    margin-top: auto;
  }
  h3 .to {
    font-weight: 600;
    color: ${nocturne.onGreenMuted};
  }
  .car {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: ${nocturne.onGreenMuted};
  }
  .plate {
    padding: 2px 8px;
    border-radius: 6px;
    background: ${nocturne.cream};
    color: ${nocturne.bg};
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 14px;
    font-weight: 800;
    line-height: 20px;
    letter-spacing: 0.06em;
  }

  .facts {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: start;
    column-gap: clamp(16px, 8cqi, 32px);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .facts li {
    display: flex;
    align-items: baseline;
    gap: clamp(4px, 2cqi, 8px);
    min-width: 0;
    font-size: clamp(12px, 4cqi, 16px);
    font-weight: 600;
    white-space: nowrap;
    color: ${nocturne.onGreenMuted};
  }
  .facts b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(18px, 7cqi, 28px);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: ${nocturne.onGreen};
    font-variant-numeric: tabular-nums;
  }
  .facts .money b {
    color: ${nocturne.lime};
  }

  @container (max-width: 480px) {
    .head {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }
    .title {
      gap: 4px;
    }
    h3 {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      font-size: clamp(20px, 8cqi, 28px);
    }
    h3 .town {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .car {
      flex-wrap: nowrap;
      justify-content: space-between;
    }
    .car > span:first-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .plate {
      flex: none;
    }
    .facts {
      grid-template-columns: auto auto;
      justify-content: space-between;
      column-gap: 16px;
    }
  }

  @media (max-width: 600px) {
    gap: 16px;
    padding: 12px 8px 16px;
  }
`;

const Corner = styled.span`
  display: inline-flex;
  flex: none;
`;

const Timer = styled.p`
  display: grid;
  flex: none;
  justify-items: end;
  gap: 4px;
  margin: 0;
  padding-top: 4px;

  .lead {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: clamp(12px, 3.6cqi, 14px);
    font-weight: 600;
    white-space: nowrap;
    color: ${nocturne.onGreenMuted};
  }
  .lead svg {
    color: ${nocturne.lime};
  }
  .units {
    display: flex;
    align-items: baseline;
    gap: clamp(2px, 1cqi, 4px);
    white-space: nowrap;
  }
  .unit {
    display: inline-flex;
    align-items: baseline;
    gap: 1px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(12px, 3.6cqi, 17px);
    font-weight: 700;
    color: ${nocturne.onGreenMuted};
  }
  .unit b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(15px, 5.2cqi, 22px);
    font-weight: 800;
    line-height: 1.25;
    color: ${nocturne.onGreen};
    font-variant-numeric: tabular-nums;
  }
  .unit.tick b {
    color: ${nocturne.lime};
  }

  @container (max-width: 480px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    background: color-mix(in oklab, ${nocturne.onGreen} 10%, transparent);

    .lead {
      font-size: 14px;
    }
    .units {
      gap: 12px;
    }
    .unit {
      gap: 2px;
      font-size: 14px;
    }
    .unit b {
      font-size: clamp(18px, 6.4cqi, 24px);
    }
  }
`;

const Acts = styled.div<{ $running: boolean }>`
  grid-area: acts;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 0 20px 20px;

  > :first-child {
    flex: ${({ $running }) => ($running ? "1 1 auto" : "none")};
    min-width: 0;
  }
  > a,
  > button {
    min-height: ${({ $running }) => ($running ? "60px" : "48px")};
  }
  .spacer {
    flex: 1;
  }

  @media (max-width: 760px) {
    padding: 12px 8px 8px;

    .spacer {
      display: none;
    }
    ${({ $running }) =>
      $running
        ? `
      flex-direction: column;
      align-items: stretch;
    `
        : `
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);

      > :first-child:nth-last-child(4) {
        grid-column: 1 / -1;
      }
    `}
  }
`;

const OpenRide = styled(Link)`
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 24px;
  border-radius: 999px;
  background: color-mix(in oklab, ${nocturne.onGreen} 14%, transparent);
  color: ${nocturne.onGreen};
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: color-mix(in oklab, ${nocturne.onGreen} 22%, transparent);
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const MapWell = styled.div`
  grid-area: win;
  position: relative;
  min-height: 240px;
  overflow: hidden;
  border-radius: 16px;
  background: color-mix(in oklab, ${nocturne.onGreen} 10%, transparent);

  @media (max-width: 760px) {
    min-height: 200px;
    border-radius: 12px;
  }
`;

const SeatWell = styled.div`
  grid-area: win;
  display: grid;
  grid-template-rows: auto 1fr;
  justify-items: center;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 16px;
  border-radius: 16px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};

  .price {
    justify-self: start;
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 4px 12px;
    border-radius: 8px;
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
    font-size: 14px;
    font-weight: 600;
  }
  .price b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 760px) {
    padding: 12px 8px 16px;
    border-radius: 12px;

    .price {
      margin-left: 8px;
    }
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

function Countdown({ target, lead }: { target: number; lead: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (now == null) {
    return (
      <Timer aria-hidden>
        <span className="lead">
          <Clock size={16} />
          {lead}
        </span>
        <span className="units">
          <span className="unit">
            <b>&nbsp;</b>
          </span>
        </span>
      </Timer>
    );
  }

  const total = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const units = [
    { key: "d", value: days, label: "d" },
    { key: "h", value: hours, label: "h" },
    { key: "m", value: mins, label: "m" },
    { key: "s", value: secs, label: "s" },
  ].filter((u, i, all) => u.key === "s" || u.value > 0 || all.slice(0, i).some((x) => x.value > 0));
  const spoken = units.map((u) => `${u.value}${u.label}`).join(" ");

  return (
    <Timer role="timer" aria-label={`${lead} ${spoken}`}>
      <span className="lead" aria-hidden>
        <Clock size={16} />
        {lead}
      </span>
      <span className="units" aria-hidden>
        {units.map((u) => (
          <span key={u.key} className={u.key === "s" ? "unit tick" : "unit"}>
            <b>
              <RollingNumber value={u.value} duration={u.key === "s" ? 400 : 900} />
            </b>
            {u.label}
          </span>
        ))}
      </span>
    </Timer>
  );
}

export function RideHero({
  trip,
  running,
  route,
  status,
  countdown,
  news,
  actions,
  trailing,
  busy,
}: {
  trip: PublishedTrip;
  running: boolean;
  route?: Promise<TripRoute | null>;
  status: ReactNode;
  countdown: { target: number; lead: string } | null;
  news: { key: string; text: string } | null;
  actions: ReactNode;
  trailing?: ReactNode;
  busy?: ReactNode;
}) {
  const booked = trip.paid_seats + trip.awaiting_payment;
  const carLoc = useTripLocation(trip.id, running);
  const car = trip.vehicle ? [trip.vehicle.make, trip.vehicle.model].filter(Boolean).join(" ") : "";
  const time = formatTripTime(trip.departure_time);
  const day = formatTripDate(trip.departure_date);
  const hasWindow = running ? route != null : true;
  const carLine = running ? [car, time && `left ${time}`].filter(Boolean).join(" · ") : car || "Car to add";

  return (
    <Card $window={hasWindow} $running={running} aria-label={`${trip.from_location} to ${trip.to_location}`}>
      <Info>
        <div className="head">
          <div className="title">
            <h3>
              <span className="town">{trip.from_location}</span> <span className="to">to</span>{" "}
              <span className="town">{trip.to_location}</span>
            </h3>
            <p className="car">
              {carLine ? <span>{carLine}</span> : null}
              {trip.vehicle?.plate_number && <span className="plate">{trip.vehicle.plate_number}</span>}
              {countdown && status ? status : null}
            </p>
          </div>
          {countdown ? (
            <Countdown target={countdown.target} lead={countdown.lead} />
          ) : status ? (
            <Corner>{status}</Corner>
          ) : null}
        </div>

        {running ? (
          <ul className="facts">
            <li>
              <b>
                <RollingNumber value={trip.paid_seats} />
              </b>
              of {trip.seats_total} on board
            </li>
            {trip.fares_paid != null ? (
              <li className="money">
                <b>{formatCurrency(trip.fares_paid)}</b>
                paid
              </li>
            ) : null}
          </ul>
        ) : (
          <ul className="facts">
            <li>
              <b>{time || "Time to confirm"}</b>
              {day}
            </li>
            <li>
              <b>
                <RollingNumber value={booked} />
              </b>
              of {trip.seats_total} booked
            </li>
          </ul>
        )}

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

        {busy}
      </Info>

      <Acts $running={running}>
        {actions}
        <OpenRide href={`/ride/${trip.id}`}>Open ride</OpenRide>
        {trailing ? (
          <>
            <span className="spacer" />
            {trailing}
          </>
        ) : null}
      </Acts>

      {running ? (
        route ? (
          <MapWell>
            <RouteMap
              route={route}
              fromLabel={trip.from_location}
              toLabel={trip.to_location}
              car={carLoc}
              follow={carLoc != null}
              padding={MINI_PAD}
              bare
            />
          </MapWell>
        ) : null
      ) : (
        <SeatWell aria-label="Seats">
          <span className="price">
            <b>{formatCurrency(trip.price_per_seat)}</b>a seat
          </span>
          <SeatMap
            total={trip.seats_total}
            paid={trip.paid_seats}
            booked={trip.awaiting_payment}
            requested={trip.pending_requests}
            riders={trip.riders}
          />
        </SeatWell>
      )}
    </Card>
  );
}
