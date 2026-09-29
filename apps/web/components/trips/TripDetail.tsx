"use client";

import Link from "next/link";
import styled, { useTheme } from "styled-components";
import {
  ArrowLeft,
  CalendarBlank,
  Clock,
  MapPin,
  NavigationArrow,
  Receipt,
  SealCheck,
  Star,
  Users,
} from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { ContentWidth } from "@/components/nav/AppShell";
import { ButtonLink } from "@/components/ui/primitives";
import { cityGradient, cityInitial } from "@/lib/places/photo";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import type { Booking } from "@/lib/trips/types";
import { STATUS_ICON, STATUS_LABEL, statusTone } from "./statusTone";
import { TripHelp } from "./TripHelp";

const Page = styled(ContentWidth)`
  padding-block: 16px 56px;
  display: grid;
  gap: 20px;
`;

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 0.92rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  &:hover {
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Hero = styled.div<{ $from: string; $to: string }>`
  position: relative;
  min-height: 220px;
  display: flex;
  align-items: flex-end;
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
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
    font-size: 150px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.13);
    line-height: 1;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.15) 0%,
      rgba(0, 0, 0, 0.08) 40%,
      rgba(0, 0, 0, 0.8) 100%
    );
  }
  .copy {
    position: relative;
    padding: 20px;
    color: #fff;
  }
  .copy h1 {
    margin: 0;
    font-size: clamp(1.8rem, 4.5vw, 2.6rem);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.05;
  }
  .copy .from {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.92);
  }
`;

const Chip = styled.span<{ $bg: string; $on: string }>`
  position: absolute;
  top: 16px;
  left: 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: ${({ $bg }) => $bg};
  color: ${({ $on }) => $on};
  font-size: 0.78rem;
  font-weight: 800;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.section`
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  h2 {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.94rem;
  color: ${({ theme }) => theme.color.onSurface};

  svg {
    flex: none;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .soft {
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    font-size: 0.88rem;
  }
`;

const Route = styled.div`
  display: grid;
  gap: 0;

  .leg {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .rail {
    display: grid;
    justify-items: center;
    padding-top: 4px;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: ${({ theme }) => theme.color.primary};
  }
  .dot.end {
    background: ${({ theme }) => theme.color.tertiary};
  }
  .line {
    width: 2px;
    height: 34px;
    background: ${({ theme }) => theme.color.surfaceContainerHighest};
  }
  .label {
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .place {
    font-size: 1rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Fare = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};

  .total {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: ${({ theme }) => theme.color.primary};
  }
  .label {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export function TripDetail({
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
  const finished = booking.status === "completed" || booking.status === "cancelled";

  return (
    <Page $max={860}>
      <Back href="/trips">
        <ArrowLeft size={17} /> All trips
      </Back>

      <Hero $from={from} $to={to}>
        {booking.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={booking.photo_url} alt="" />
        ) : (
          <span className="monogram" aria-hidden="true">
            {cityInitial(destination)}
          </span>
        )}
        <span className="scrim" />
        <Chip $bg={tone.bg} $on={tone.on}>
          <Icon size={13} weight="fill" />
          {STATUS_LABEL[booking.status]}
        </Chip>
        <div className="copy">
          <h1>{destination}</h1>
          {origin && (
            <span className="from">
              <NavigationArrow size={14} weight="fill" /> From {origin}
            </span>
          )}
        </div>
      </Hero>

      <Grid>
        <Card>
          <h2>Route</h2>
          <Route>
            <div className="leg">
              <div className="rail">
                <span className="dot" />
                <span className="line" />
              </div>
              <div>
                <div className="label">Pick-up</div>
                <div className="place">{origin || "—"}</div>
              </div>
            </div>
            <div className="leg">
              <div className="rail">
                <span className="dot end" />
              </div>
              <div>
                <div className="label">Drop-off</div>
                <div className="place">{destination}</div>
              </div>
            </div>
          </Route>

          <Row>
            <CalendarBlank size={16} />
            <span className="grow">
              {formatTripDate(booking.trip?.departure_date ?? null) || "Date to confirm"}
            </span>
          </Row>
          <Row>
            <Clock size={16} />
            <span className="grow">
              {formatTripTime(booking.trip?.departure_time ?? null) || "Time to confirm"}
            </span>
          </Row>
          <Row>
            <Users size={16} />
            <span className="grow">
              {booking.seats_booked} {booking.seats_booked === 1 ? "seat" : "seats"}
            </span>
          </Row>
        </Card>

        <Card>
          <h2>{isDriver ? "Passenger" : "Driver"}</h2>
          <Row>
            <Avatar
              name={person?.full_name || "Kipita user"}
              src={person?.avatar_url}
              size={46}
            />
            <span className="grow">
              <span style={{ fontWeight: 700 }}>
                {person?.full_name || "Kipita user"}
              </span>
              {person?.is_verified && (
                <SealCheck
                  size={15}
                  weight="fill"
                  style={{ verticalAlign: "-3px", marginLeft: 5 }}
                />
              )}
              <span className="soft" style={{ display: "block" }}>
                {person?.rating ? `${person.rating.toFixed(1)} rating` : "New to Kipita"}
                {person?.total_trips ? ` · ${person.total_trips} trips` : ""}
              </span>
            </span>
          </Row>

          {booking.booking_reference && (
            <Row>
              <Receipt size={16} />
              <span className="grow">
                Reference <b>{booking.booking_reference}</b>
              </span>
            </Row>
          )}

          <Fare>
            <span className="label">
              {booking.status === "pending_payment" ? "Due now" : "Total paid"}
            </span>
            <span className="total">{formatCurrency(booking.total_price)}</span>
          </Fare>

          <Actions>
            {booking.status === "pending_payment" && (
              <ButtonLink href={`/ride/${booking.trip_id}`} $compact>
                Pay {formatCurrency(booking.total_price)}
              </ButtonLink>
            )}
            {booking.status === "completed" && (
              <ButtonLink href={`/ride/${booking.trip_id}`} $compact $variant="ghost">
                <Star size={16} /> Rate this trip
              </ButtonLink>
            )}
            {!finished && (
              <ButtonLink href={`/ride/${booking.trip_id}`} $compact $variant="ghost">
                <MapPin size={16} /> View the ride
              </ButtonLink>
            )}
          </Actions>
        </Card>
      </Grid>

      <TripHelp booking={booking} />
    </Page>
  );
}
