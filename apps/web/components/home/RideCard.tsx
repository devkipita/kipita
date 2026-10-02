"use client";

import Link from "next/link";
import styled, { keyframes } from "styled-components";
import {
  ArrowRight,
  CalendarSolid,
  CarSolid,
  ClockSolid,
  Star,
  Tag,
  Users,
  VerifiedBadge,
  Warning,
} from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { formatKes } from "@/lib/rides";
import { discountedFare } from "@/lib/home/offer";
import { formatRideDate, formatRideTime } from "@/lib/ride-detail";
import type { HomeItem, HomeTrip, VehicleType } from "@/lib/home/search";
import { RequestCard } from "./RequestCard";
import { RideAmenities } from "./RideAmenities";

const SCARCE = 2;
const MAX_AMENITIES = 1;

const CAR_EMOJI: Record<VehicleType, string> = {
  sedan: "🚗",
  suv: "🚙",
  van: "🚐",
  minibus: "🚌",
  pickup: "🛻",
  motorbike: "🏍️",
};

const rise = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.985); }
  to   { opacity: 1; transform: none; }
`;

const pop = keyframes`
  0%   { opacity: 0; transform: scale(0.6) translateY(-4px); }
  70%  { opacity: 1; transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
`;

const Card = styled(Link)<{ $index: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.elevation[1]};
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  cursor: pointer;

  animation: ${rise} ${({ theme }) => theme.motion.duration.long1}
    ${({ theme }) => theme.motion.easing.emphasizedDecelerate} backwards;
  animation-delay: ${({ $index }) => Math.min($index, 5) * 60}ms;

  transition:
    background ${({ theme }) => theme.motion.duration.short4}
      ${({ theme }) => theme.motion.easing.standard},
    border-radius ${({ theme }) => theme.motion.duration.short3}
      ${({ theme }) => theme.motion.easing.standard},
    transform ${({ theme }) => theme.motion.duration.medium2}
      ${({ theme }) => theme.motion.easing.emphasized},
    box-shadow ${({ theme }) => theme.motion.duration.medium2}
      ${({ theme }) => theme.motion.easing.emphasized};

  &:hover {
    background: ${({ theme }) => theme.color.elevatedHover};
    box-shadow: ${({ theme }) => theme.elevation[3]};
    transform: translateY(-4px);
  }
  &:hover .fare b {
    letter-spacing: -0.02em;
  }
  &:active {
    border-radius: ${({ theme }) => theme.radius.sm};
    transform: translateY(0) scale(0.975);
    box-shadow: ${({ theme }) => theme.elevation[1]};
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: background ${({ theme }) => theme.motion.duration.short4} linear;
    &:hover,
    &:active {
      transform: none;
      border-radius: ${({ theme }) => theme.radius.md};
    }
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  flex: 1 1 300px;
  min-width: 0;

  .details {
    flex: 1;
    min-width: 0;
  }
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xl};
  min-width: 0;
`;

const Emoji = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.elevatedInset};
  font-size: 30px;
  line-height: 1;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  margin-bottom: ${({ theme }) => theme.space.md};
`;

const Deal = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px 5px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.tone.deep.bg};
  color: ${({ theme }) => theme.tone.deep.on};
  font-size: ${({ theme }) => theme.type.micro};
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  animation: ${pop} ${({ theme }) => theme.motion.duration.medium4}
    ${({ theme }) => theme.motion.easing.spring} 220ms backwards;

  svg {
    flex: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Scarce = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 5px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.warningContainer};
  color: ${({ theme }) => theme.color.onWarningContainer};
  font-size: ${({ theme }) => theme.type.micro};
  font-weight: 700;
  white-space: nowrap;

  svg {
    flex: none;
  }
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  padding: ${({ theme }) => theme.space.lg};
`;

const Route = styled.h3`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin: 0 0 6px;
  min-width: 0;
  font-family: ${({ theme }) => theme.font};
  font-size: ${({ theme }) => theme.type.subhead};
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.onSurface};

  .town {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  svg {
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
`;

const Facts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px ${({ theme }) => theme.space.md};
  min-width: 0;
`;

const Fact = styled.span<{ $hue: "date" | "time" | "car" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 500;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  svg {
    flex: none;
    color: ${({ theme, $hue }) =>
      $hue === "date"
        ? theme.color.info
        : $hue === "time"
          ? theme.color.tertiary
          : theme.color.secondary};
  }
`;

const Who = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.md};
  flex: 1 1 340px;
  min-width: 0;

  .copy {
    min-width: 0;
    flex: 1;
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
    --badge-knockout: ${({ theme }) => theme.color.elevated};
  }
  .trust {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
    font-size: ${({ theme }) => theme.type.micro};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    white-space: nowrap;
  }
  .trust svg {
    flex: none;
    color: ${({ theme }) => theme.color.warning};
  }
  .trust b {
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Chips = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  margin-top: ${({ theme }) => theme.space.sm};
  min-width: 0;
  overflow: hidden;
`;

const Seats = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  padding: 3px 10px 3px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.elevatedInset};
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  font-size: ${({ theme }) => theme.type.micro};
  font-weight: 500;
  white-space: nowrap;

  svg {
    flex: none;
  }
`;

const Fare = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: none;
  gap: 2px;
  min-width: 96px;
  margin-left: auto;
  text-align: right;

  b {
    font-family: ${({ theme }) => theme.font};
    font-size: ${({ theme }) => theme.type.heading};
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.05;
    white-space: nowrap;
    color: ${({ theme }) => theme.color.primary};
    transition: letter-spacing ${({ theme }) => theme.motion.duration.medium2}
      ${({ theme }) => theme.motion.easing.emphasized};
  }
  s {
    font-size: ${({ theme }) => theme.type.label};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    text-decoration-thickness: 1px;
  }
  small {
    font-size: ${({ theme }) => theme.type.micro};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }

  @media (max-width: 640px) {
    flex-direction: row;
    align-items: baseline;
    flex-basis: 100%;
    justify-content: space-between;
    margin-left: 0;
    padding-top: ${({ theme }) => theme.space.md};
    border-top: 1px solid ${({ theme }) => theme.color.outlineVariant};
    text-align: left;
  }

  @media (prefers-reduced-motion: reduce) {
    b {
      transition: none;
    }
  }
`;

export function RideCard({
  item,
  index = 0,
  hovered = false,
  onHoverChange,
}: {
  item: HomeItem;
  index?: number;
  hovered?: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
  if (item.kind === "request") {
    return (
      <RequestCard
        item={item}
        index={index}
        hovered={hovered}
        onHoverChange={onHoverChange}
      />
    );
  }

  return (
    <TripCard
      item={item}
      index={index}
      hovered={hovered}
      onHoverChange={onHoverChange}
    />
  );
}

function TripCard({
  item,
  index,
  hovered,
  onHoverChange,
}: {
  item: HomeTrip;
  index: number;
  hovered: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
  const person = item.person;
  const name = person?.full_name?.trim() || "Kipita driver";

  const date = formatRideDate(item.departure_date) ?? "Flexible";
  const time = formatRideTime(item.departure_time);

  const seats = item.seats_available;
  const scarce = seats > 0 && seats <= SCARCE;

  const off = item.discount_percent;
  const price = formatKes(item.price_per_seat);
  const deal = off ? discountedFare(item.price_per_seat, off) : null;

  const seatLabel = `${seats} ${seats === 1 ? "seat" : "seats"}`;
  const scarceLabel = `Only ${seats} left`;

  const vehicle = item.vehicle;
  const model = [vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
  const emoji = CAR_EMOJI[vehicle?.vehicle_type ?? "sedan"];

  const rating = person?.rating && person.rating > 0 ? person.rating : null;
  const trips = person?.total_trips ?? 0;

  return (
    <Card
      href={`/ride/${item.id}`}
      $index={index}
      data-hovered={hovered ? "true" : "false"}
      onMouseEnter={() => onHoverChange?.(item.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      onFocus={() => onHoverChange?.(item.id)}
      onBlur={() => onHoverChange?.(null)}
      aria-label={
        `${item.from_location} to ${item.to_location}, ${date}${time ? `, ${time}` : ""}` +
        (model ? `, ${model}` : "") +
        `, ${deal ? formatKes(deal) : price} per seat` +
        (off ? `, ${off} percent off this ride` : "") +
        `, ${scarce ? scarceLabel : seatLabel}, with ${name}`
      }
    >
      <Body>
        {(off || scarce) && (
          <Tags>
            {off ? (
              <Deal>
                <Tag size={12} />
                {off}% off
              </Deal>
            ) : null}
            {scarce && (
              <Scarce>
                <Warning size={12} weight="fill" />
                {scarceLabel}
              </Scarce>
            )}
          </Tags>
        )}

        <Row>
          <Who>
            <Avatar name={name} src={person?.avatar_url} size={48} />
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
                <Star size={12} weight="fill" aria-hidden="true" />
                {rating ? (
                  <>
                    <b>{rating.toFixed(1)}</b>
                    {trips > 0 && <span>· {trips} trips</span>}
                  </>
                ) : (
                  <b>New driver</b>
                )}
              </span>

              <Chips>
                <Seats>
                  <Users size={12} />
                  {seatLabel}
                </Seats>
                <RideAmenities
                  preferences={item.preferences}
                  max={MAX_AMENITIES}
                />
              </Chips>
            </span>
          </Who>

          <Head>
            <Emoji aria-hidden="true">{emoji}</Emoji>
            <div className="details">
              <Route>
                <span className="town">{item.from_location}</span>
                <ArrowRight size={16} aria-hidden="true" />
                <span className="town">{item.to_location}</span>
              </Route>

              <Facts>
                <Fact $hue="date">
                  <CalendarSolid size={15} />
                  <VisuallyHidden>Date</VisuallyHidden>
                  {date}
                </Fact>
                {time && (
                  <Fact $hue="time">
                    <ClockSolid size={15} />
                    <VisuallyHidden>Departs</VisuallyHidden>
                    {time}
                  </Fact>
                )}
                <Fact $hue="car">
                  <CarSolid size={15} />
                  <VisuallyHidden>Vehicle</VisuallyHidden>
                  {model || "Car to be confirmed"}
                </Fact>
              </Facts>
            </div>
          </Head>

          <Fare className="fare">
            <b>{deal ? formatKes(deal) : price}</b>
            {deal && <s>{price}</s>}
            <small>per seat</small>
          </Fare>
        </Row>
      </Body>
    </Card>
  );
}
