"use client";

import Link from "next/link";
import styled, { useTheme } from "styled-components";
import { CalendarBlank, Clock, NavigationArrow, Users } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { cityGradient, cityInitial } from "@/lib/places/photo";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import type { Booking } from "@/lib/trips/types";
import { STATUS_ICON, STATUS_LABEL, statusTone } from "./statusTone";

const HERO = 152;

const Shell = styled(Link)`
  display: block;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  overflow: hidden;
  transition: transform 0.18s ease, background 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceContainer};
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const Hero = styled.div<{ $from: string; $to: string }>`
  position: relative;
  height: ${HERO}px;
  display: flex;
  align-items: flex-end;
  background: linear-gradient(135deg, ${({ $from }) => $from}, ${({ $to }) => $to});

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .monogram {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 96px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.14);
    line-height: 1;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.12) 0%,
      rgba(0, 0, 0, 0.05) 38%,
      rgba(0, 0, 0, 0.78) 100%
    );
  }
`;

const Chip = styled.span<{ $bg: string; $on: string }>`
  position: absolute;
  top: 14px;
  left: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: ${({ $bg }) => $bg};
  color: ${({ $on }) => $on};
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: -0.01em;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: currentColor;
  }
`;

const HeroCopy = styled.div`
  position: relative;
  padding: 16px;
  color: #fff;

  .city {
    margin: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
    text-shadow: 0 1px 10px rgba(0, 0, 0, 0.4);
  }
  .from {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 3px;
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.9);
  }
`;

const Body = styled.div`
  padding: 16px;
  display: grid;
  gap: 12px;
`;

const Person = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .who {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-size: 0.95rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurface};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .role {
    font-size: 0.78rem;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .fare {
    flex: none;
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.primary};
  }
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  svg {
    flex: none;
  }
  .sep {
    width: 3px;
    height: 3px;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.6;
    margin-inline: 3px;
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
  const [from, to] = cityGradient(destination);
  const live = booking.status === "in_progress";

  return (
    <Shell
      href={`/trips/${booking.id}`}
      aria-label={`${origin} to ${destination}, ${STATUS_LABEL[booking.status]}, ${formatCurrency(booking.total_price)}`}
    >
      <Hero $from={from} $to={to}>
        {booking.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={booking.photo_url} alt="" loading="lazy" />
        ) : (
          <span className="monogram" aria-hidden="true">
            {cityInitial(destination)}
          </span>
        )}
        <span className="scrim" />

        <Chip $bg={tone.bg} $on={tone.on}>
          {live ? <span className="dot" /> : <Icon size={12} weight="fill" />}
          {STATUS_LABEL[booking.status]}
        </Chip>

        <HeroCopy>
          <p className="city">{destination}</p>
          {origin && (
            <span className="from">
              <NavigationArrow size={12} weight="fill" /> From {origin}
            </span>
          )}
        </HeroCopy>
      </Hero>

      <Body>
        <Person>
          <Avatar
            name={person?.full_name || "Kipita user"}
            src={person?.avatar_url}
            size={38}
          />
          <div className="who">
            <div className="name">{person?.full_name || "Kipita user"}</div>
            <div className="role">{isDriver ? "Passenger" : "Driver"}</div>
          </div>
          <div className="fare">{formatCurrency(booking.total_price)}</div>
        </Person>

        {booking.trip && (
          <Meta>
            <CalendarBlank size={14} />
            {formatTripDate(booking.trip.departure_date)}
            <span className="sep" />
            <Clock size={14} />
            {formatTripTime(booking.trip.departure_time)}
            <span className="sep" />
            <Users size={14} />
            {booking.seats_booked}
          </Meta>
        )}
      </Body>
    </Shell>
  );
}
