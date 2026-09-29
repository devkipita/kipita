"use client";

import Link from "next/link";
import styled from "styled-components";
import { CaretRight, Users, VerifiedBadge, Warning } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { formatKes } from "@/lib/rides";
import { formatRideDate, formatRideTime, ratingLabel } from "@/lib/ride-detail";
import type { HomeItem } from "@/lib/home/search";
import { RideAmenities } from "./RideAmenities";

const SCARCE = 2;

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  min-width: 0;
  padding: ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceContainer};
    transform: translateY(-2px);
  }
  &:hover .go {
    transform: translateX(3px);
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover,
    &:hover .go {
      transform: none;
    }
  }
`;

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  min-width: 0;

  .copy {
    min-width: 0;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .name b {
    min-width: 0;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name svg {
    flex: none;
    color: ${({ theme }) => theme.color.info};
    --badge-knockout: ${({ theme }) => theme.color.surfaceContainerLow};
  }
  .trust {
    margin-top: 2px;
    font-size: ${({ theme }) => theme.type.label};
    color: ${({ theme }) => theme.color.textSoft};
    white-space: nowrap;
  }
`;

const When = styled.p`
  margin: 0 0 ${({ theme }) => theme.space.md};
  font-size: ${({ theme }) => theme.type.subhead};
  font-weight: 600;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.color.onSurface};
`;

const Route = styled.div`
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  column-gap: ${({ theme }) => theme.space.md};
  row-gap: 0;
  align-items: center;

  .mark {
    position: relative;
    display: grid;
    place-items: center;
    height: 26px;
  }
  .ring {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    border: 2.5px solid ${({ theme }) => theme.color.outline};
  }
  .pin {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: ${({ theme }) => theme.color.primary};
  }
  .mark.start::after {
    content: "";
    position: absolute;
    top: 20px;
    width: 2px;
    height: 12px;
    border-radius: 2px;
    background: ${({ theme }) => theme.color.outlineVariant};
  }
  .town {
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    color: ${({ theme }) => theme.color.onSurface};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const Foot = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  column-gap: ${({ theme }) => theme.space.md};
  row-gap: ${({ theme }) => theme.space.sm};
  padding-top: ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
`;

const Seats = styled.span<{ $scarce: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  grid-column: 1;
  min-width: 0;
  white-space: nowrap;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: ${({ $scarce }) => ($scarce ? 600 : 400)};
  color: ${({ theme, $scarce }) =>
    $scarce ? theme.color.warning : theme.color.textSoft};

  svg {
    flex: none;
  }
`;

const Amenities = styled.div`
  grid-column: 1;
  min-width: 0;
`;

const Price = styled.div<{ $accent: boolean }>`
  grid-column: 2;
  grid-row: 1 / span 2;
  display: flex;
  align-items: baseline;
  gap: 4px;
  align-self: center;
  white-space: nowrap;

  b {
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: ${({ theme }) => theme.type.heading};
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
    color: ${({ theme, $accent }) =>
      $accent ? theme.color.primary : theme.color.onSurface};
  }
  small {
    font-size: ${({ theme }) => theme.type.label};
    color: ${({ theme }) => theme.color.textSoft};
  }
  .go {
    align-self: center;
    margin-left: 2px;
    color: ${({ theme }) => theme.color.textSoft};
    transition: transform 0.18s ease;
  }
`;

export function RideCard({
  item,
  hovered = false,
  onHoverChange,
}: {
  item: HomeItem;
  hovered?: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
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
  const when = [date ?? "Flexible", time].filter(Boolean).join(" · ");

  const seats = isTrip ? item.seats_available : item.seats_needed;
  const scarce = isTrip && seats > 0 && seats <= SCARCE;
  const price = isTrip ? formatKes(item.price_per_seat) : null;

  const seatLabel = isTrip
    ? scarce
      ? `Only ${seats} left`
      : `${seats} seats left`
    : `${seats} ${seats === 1 ? "seat" : "seats"} wanted`;

  return (
    <Card
      href={`/ride/${item.id}${isTrip ? "" : "?kind=request"}`}
      data-hovered={hovered ? "true" : "false"}
      onMouseEnter={() => onHoverChange?.(item.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      onFocus={() => onHoverChange?.(item.id)}
      onBlur={() => onHoverChange?.(null)}
      aria-label={
        `${when}, ${item.from_location} to ${item.to_location}, ` +
        (isTrip ? `${price} per seat, ${seatLabel}` : seatLabel) +
        `, with ${name}`
      }
    >
      <Who>
        <Avatar name={name} src={person?.avatar_url} size={40} />
        <span className="copy">
          <span className="name">
            <b>{name}</b>
            {person?.is_verified && (
              <>
                <VerifiedBadge size={16} />
                <VisuallyHidden>Verified</VisuallyHidden>
              </>
            )}
          </span>
          <span className="trust">
            {ratingLabel(person?.rating, person?.total_trips)}
          </span>
        </span>
      </Who>

      <div>
        <When>{when}</When>
        <Route>
          <span className="mark start" aria-hidden="true">
            <span className="ring" />
          </span>
          <span className="town">{item.from_location}</span>

          <span className="mark" aria-hidden="true">
            <span className="pin" />
          </span>
          <span className="town">{item.to_location}</span>
        </Route>
      </div>

      <Foot>
        <Amenities>
          <RideAmenities preferences={item.preferences} />
        </Amenities>

        <Seats $scarce={scarce}>
          {scarce ? <Warning size={15} weight="fill" /> : <Users size={15} />}
          {seatLabel}
        </Seats>

        <Price $accent={isTrip}>
          {isTrip ? (
            <>
              <b>{price}</b>
              <small>/ seat</small>
            </>
          ) : (
            <b>{seats}</b>
          )}
          <CaretRight className="go" size={18} aria-hidden="true" />
        </Price>
      </Foot>
    </Card>
  );
}
