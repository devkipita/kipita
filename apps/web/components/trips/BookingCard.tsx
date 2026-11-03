"use client";

import Link from "next/link";
import styled, { useTheme } from "styled-components";
import { ArrowRight, CalendarBlank, Clock, Users } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import type { Booking } from "@/lib/trips/types";
import { STATUS_ICON, STATUS_LABEL, statusTone } from "./statusTone";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

const Row = styled(Link)`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px 32px;
  padding: clamp(20px, 2.6vh, 28px) 14px;
  margin-inline: -14px;
  border-radius: 14px;
  text-decoration: none;
  transition: background-color 0.16s ease;

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
    &:hover .route {
      color: ${nocturne.accent};
    }
    &:hover .route svg {
      transform: translateX(4px);
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover .route svg {
      transform: none;
    }
  }
`;

const Main = styled.div`
  min-width: 0;
`;

const Status = styled.p<{ $on: string }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 8px;
  font-size: 13.5px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: ${({ $on }) => $on};

  svg {
    flex: none;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: currentColor;
  }
`;

const Route = styled.p`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 12px;
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(23px, 2.5vw, 31px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.032em;
  color: ${nocturne.cream};
  transition: color 0.16s ease;

  svg {
    flex: none;
    color: ${nocturne.accent};
    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
`;

const Facts = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 15px;
    color: ${nocturne.muted};
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Side = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  .who {
    min-width: 0;
    text-align: right;
  }
  .name {
    font-size: 15px;
    font-weight: 700;
    color: ${nocturne.cream};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fare {
    margin-top: 2px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }

  @media (max-width: 720px) {
    justify-content: flex-start;
    padding-top: 16px;
    border-top: 1.5px solid ${RULE};

    .who {
      text-align: left;
    }
  }
`;

export function BookingCard({
  booking,
  viewerId,
}: {
  booking: Booking;
  viewerId: string;
}) {
  const theme = useTheme();
  const tone = statusTone(theme, booking.status);
  const Icon = STATUS_ICON[booking.status];

  const isDriver = booking.driver_id === viewerId;
  const person = isDriver ? booking.passenger : booking.driver;
  const destination = booking.trip?.to_location ?? "Trip";
  const origin = booking.trip?.from_location ?? "";
  const live = booking.status === "in_progress";

  return (
    <Row
      href={`/trips/${booking.id}`}
      aria-label={`${origin} to ${destination}, ${STATUS_LABEL[booking.status]}, ${formatCurrency(booking.total_price)}`}
    >
      <Main>
        <Status $on={tone.bg}>
          {live ? <span className="dot" /> : <Icon size={15} weight="fill" />}
          {STATUS_LABEL[booking.status]}
        </Status>

        <Route className="route">
          {origin && (
            <>
              <span>{origin}</span>
              <ArrowRight size={21} aria-hidden />
            </>
          )}
          <span>{destination}</span>
        </Route>

        {booking.trip && (
          <Facts>
            <li>
              <CalendarBlank size={17} />
              {formatTripDate(booking.trip.departure_date)}
            </li>
            <li>
              <Clock size={17} />
              {formatTripTime(booking.trip.departure_time)}
            </li>
            <li>
              <Users size={17} />
              {booking.seats_booked}{" "}
              {booking.seats_booked === 1 ? "seat" : "seats"}
            </li>
          </Facts>
        )}
      </Main>

      <Side>
        <Avatar
          name={person?.full_name || "Kipita user"}
          src={person?.avatar_url}
          size={44}
        />
        <div className="who">
          <div className="name">{person?.full_name || "Kipita user"}</div>
          <div className="fare">{formatCurrency(booking.total_price)}</div>
        </div>
      </Side>
    </Row>
  );
}
