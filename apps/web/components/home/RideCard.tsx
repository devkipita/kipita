"use client";

import Link from "next/link";
import styled from "styled-components";
import { ArrowRight, BadgeCheck, CalendarDays, Star, Users } from "lucide-react";
import { Avatar } from "@/components/profile/Avatar";
import { formatKes } from "@/lib/rides";
import { formatRideDate, formatRideTime } from "@/lib/ride-detail";
import type { HomeItem } from "@/lib/home/search";

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${({ theme }) => theme.shadow.card};
  }
`;

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;

  .name {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.95rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name svg {
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
  .meta {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
    font-size: 0.79rem;
    color: ${({ theme }) => theme.color.muted};
  }
  .meta svg {
    color: ${({ theme }) => theme.color.tan};
  }
`;

const Route = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const Stop = styled.div`
  min-width: 0;

  small {
    display: block;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.muted};
  }
  b {
    display: block;
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const Dashes = styled.span`
  flex: 1;
  position: relative;
  height: 1px;
  min-width: 24px;
  background: repeating-linear-gradient(
    to right,
    ${({ theme }) => theme.color.line} 0 5px,
    transparent 5px 10px
  );

  svg {
    position: absolute;
    right: -3px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.color.primary};
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.color.line};

  .lead b {
    display: block;
    font-size: 1.05rem;
    font-weight: 800;
    color: ${({ theme }) => theme.color.primary};
  }
  .lead span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const Seats = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 0.79rem;
  font-weight: 700;
  background: ${({ theme }) => theme.color.primaryContainer};
  color: ${({ theme }) => theme.color.onPrimaryContainer};
`;

function ratingLabel(rating: number | null, trips: number | null): string {
  const score = rating && rating > 0 ? rating.toFixed(1) : "New";
  return trips && trips > 0 ? `${score} · ${trips} trips` : score;
}

/**
 * One trip or ride request in the home carousel — the web counterpart of
 * mobile's `TripCard`, which likewise uses one card for both shapes.
 */
export function RideCard({ item }: { item: HomeItem }) {
  const isTrip = item.kind === "trip";
  const person = item.person;
  const name =
    person?.full_name?.trim() || (isTrip ? "Kipita driver" : "Kipita passenger");

  const date = formatRideDate(
    isTrip ? item.departure_date : item.preferred_date,
  );
  const time = formatRideTime(
    isTrip ? item.departure_time : item.preferred_time,
  );
  const seats = isTrip ? item.seats_available : item.seats_needed;

  return (
    <Card href={`/ride/${item.id}${isTrip ? "" : "?kind=request"}`}>
      <Who>
        <Avatar name={name} src={person?.avatar_url} size={40} />
        <div style={{ minWidth: 0 }}>
          <div className="name">
            {name}
            {person?.is_verified && <BadgeCheck size={14} strokeWidth={2.6} />}
          </div>
          <div className="meta">
            <Star size={12} fill="currentColor" strokeWidth={0} />
            {ratingLabel(person?.rating ?? null, person?.total_trips ?? null)}
          </div>
        </div>
      </Who>

      <Route>
        <Stop>
          <small>From</small>
          <b>{item.from_location}</b>
        </Stop>
        <Dashes>
          <ArrowRight size={15} strokeWidth={2.4} />
        </Dashes>
        <Stop>
          <small>To</small>
          <b>{item.to_location}</b>
        </Stop>
      </Route>

      <Foot>
        <div className="lead">
          <b>{isTrip ? formatKes(item.price_per_seat) : "Looking for a ride"}</b>
          <span>
            <CalendarDays size={12} strokeWidth={2.4} />
            {[date, time].filter(Boolean).join(" · ") || "Flexible"}
          </span>
        </div>
        <Seats>
          <Users size={13} strokeWidth={2.4} />
          {seats} {seats === 1 ? "seat" : "seats"}
        </Seats>
      </Foot>
    </Card>
  );
}
