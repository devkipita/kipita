"use client";

import Link from "next/link";
import styled from "styled-components";
import { Car, Check, Lock, MagnifyingGlass, Speech, X } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { VerifiedMark } from "@/components/alerts/VerifiedMark";
import { nocturne } from "@/lib/nocturne";
import { departureInstant } from "@kipita/shared";
import { formatCurrency, formatTripDate, formatTripTime, nairobiToday } from "@/lib/trips/format";
import type { Booking, TripPerson } from "@/lib/trips/types";
import { Chip, STATUS } from "./BookingCard";
import { Act, Road, SectionHead, fs } from "./RideRow";
import { RideStoppedArt } from "./TripsArt";

const DESK = "@media (min-width: 861px)";
const ZONE = "Africa/Nairobi";

const Wrap = styled.div`
  display: grid;
  gap: 16px;

  ${DESK} {
    gap: 24px;
  }
`;

const Hero = styled.section`
  --act-main: ${nocturne.ctaBg};
  --act-main-ink: ${nocturne.ctaFg};
  --row-ink: ${nocturne.cream};
  --row-mark: ${nocturne.muted2};

  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 16px 16px 20px;
  border-radius: 24px;
  background: ${({ theme }) =>
    `color-mix(in oklab, ${theme.color.errorContainer} 32%, ${theme.color.surfaceContainerLowest})`};
  text-align: center;

  ${DESK} {
    grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
    justify-items: start;
    align-items: center;
    gap: 40px;
    padding: 32px 40px;
    text-align: left;
  }
`;

const ArtSlot = styled.div`
  width: 100%;
  max-width: 160px;

  .tint {
    fill: ${nocturne.muted2};
    fill-opacity: 0.18;
  }

  ${DESK} {
    max-width: 280px;
  }
`;

const HeroText = styled.div`
  display: grid;
  justify-items: center;
  gap: 8px;
  min-width: 0;

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
    font-weight: 800;
    line-height: 28px;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  .when {
    margin: 0;
    font-size: ${fs.meta};
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.muted};
  }
  .still {
    margin: 4px 0 0;
    max-width: 48ch;
    font-size: ${fs.meta};
    font-weight: 600;
    line-height: 20px;
    color: ${nocturne.cream};
  }
  .reason {
    display: inline-flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0;
    max-width: 48ch;
    font-size: ${fs.meta};
    line-height: 20px;
    color: ${nocturne.cream};
    text-align: left;

    svg {
      flex: none;
      margin-top: 2px;
      color: ${nocturne.muted};
    }
  }

  ${DESK} {
    justify-items: start;
    gap: 12px;

    h2 {
      font-size: 32px;
      line-height: 40px;
    }
  }
`;

const MoneyNote = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 4px 0 0;
  padding: 12px 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.tertiaryContainer};
  color: ${({ theme }) => theme.color.onTertiaryContainer};
  font-size: ${fs.meta};
  font-weight: 600;
  line-height: 20px;
  text-align: left;

  svg {
    flex: none;
  }
`;

const HeroAct = styled(Act)`
  margin-top: 4px;
`;

const Columns = styled.div`
  display: grid;
  gap: 16px;
  align-items: start;

  ${DESK} {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 24px;
  }
`;

const Stack = styled.div`
  display: grid;
  gap: 16px;

  ${DESK} {
    gap: 24px;
  }
`;

const Panel = styled.section`
  --row-ink: ${nocturne.cream};
  --row-mark: ${nocturne.muted2};

  display: grid;
  gap: 16px;
  padding: 20px 16px;
  border-radius: 20px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};

  > h2 {
    margin: 0;
  }

  ${DESK} {
    padding: 24px;
  }
`;

const Facts = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: ${fs.meta};
  font-variant-numeric: tabular-nums;
  color: ${nocturne.muted};

  b {
    font-weight: 700;
    color: ${nocturne.cream};
  }
`;

const People = styled.ul`
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Person = styled.li`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;

  .name {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: ${fs.body};
    font-weight: 700;
    line-height: 24px;
    color: ${nocturne.cream};
  }
  .name > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .role {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    margin-top: 2px;
    font-size: ${fs.meta};
    line-height: 20px;
    color: ${nocturne.muted};
  }
  .role svg {
    flex: none;
  }
`;

const YouTag = styled.span`
  flex: none;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ theme }) => theme.color.secondaryContainer};
  color: ${({ theme }) => theme.color.onSecondaryContainer};
  font-size: 12px;
  font-weight: 700;
  line-height: 16px;
`;

const Plate = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 2px solid ${nocturne.cream};
  border-radius: 8px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  color: ${nocturne.cream};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 12px;
  font-weight: 800;
  line-height: 20px;
  letter-spacing: 0.08em;
  white-space: nowrap;
`;

const Lines = styled.dl`
  display: grid;
  gap: 12px;
  margin: 0;

  > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }
  dt {
    font-size: ${fs.meta};
    color: ${nocturne.muted};
  }
  dd {
    margin: 0;
    font-size: ${fs.meta};
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: ${nocturne.cream};
  }
  dd small {
    display: block;
    font-size: ${fs.small};
    font-weight: 600;
    color: ${nocturne.muted};
  }
  .total:not(:first-child) {
    padding-top: 12px;
    border-top: 1px solid ${nocturne.line};
  }
  .total dt {
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .total dd {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
`;

const Steps = styled.ol`
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    font-size: ${fs.meta};
    font-weight: 600;
    color: ${nocturne.cream};
  }
  li:not(:last-child)::before {
    content: "";
    position: absolute;
    left: 11px;
    top: 28px;
    width: 2px;
    height: 12px;
    border-radius: 1px;
    background: ${nocturne.line2};
  }
  .dot {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.primaryContainer};
    color: ${({ theme }) => theme.color.onPrimaryContainer};
  }
  li[data-state="stop"] .dot {
    background: ${({ theme }) => theme.color.errorContainer};
    color: ${({ theme }) => theme.color.onErrorContainer};
  }
  time {
    font-size: ${fs.small};
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.muted};
    white-space: nowrap;
  }
`;

function dayOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date(iso));
}

function moment(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const clock = new Intl.DateTimeFormat("en-KE", { timeZone: ZONE, hour: "numeric", minute: "2-digit" })
    .format(d)
    .toLowerCase();
  const day = dayOf(iso);
  if (day === nairobiToday()) return `today at ${clock}`;
  if (day === nairobiToday(-1)) return `yesterday at ${clock}`;
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, weekday: "short", day: "numeric", month: "short" }).format(d);
  return `${date} at ${clock}`;
}

function capital(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function firstName(person: TripPerson | null, fallback: string): string {
  return person?.full_name?.split(" ")[0] || fallback;
}

export function StoppedTrip({
  booking,
  viewerId,
  cancelledBy,
  noShowTier,
  moneyLine,
}: {
  booking: Booking;
  viewerId: string;
  cancelledBy: string | null;
  noShowTier: string | null;
  moneyLine: string;
}) {
  const isDriver = booking.driver_id === viewerId;
  const declined = booking.status === "rejected";
  const status = STATUS[booking.status];
  const StatusIcon = status.icon;
  const driver = firstName(booking.driver, "Your driver");
  const passenger = firstName(booking.passenger, "The passenger");
  const origin = booking.trip?.from_location ?? "Pickup to confirm";
  const destination = booking.trip?.to_location ?? "Drop-off to confirm";
  const date = formatTripDate(booking.trip?.departure_date ?? null) || "Date to confirm";
  const time = formatTripTime(booking.trip?.departure_time ?? null) || "time to confirm";
  const seats = `${booking.seats_booked} ${booking.seats_booked === 1 ? "seat" : "seats"}`;
  const fee = booking.service_fee;
  const subtotal = fee != null ? booking.total_price - fee : booking.total_price;
  const perSeat = booking.trip?.price_per_seat ?? 0;
  const seatLine = perSeat > 0 && perSeat * booking.seats_booked === subtotal ? `${seats} at ${formatCurrency(perSeat)}` : seats;
  const fare = isDriver ? subtotal : booking.total_price;
  const car = booking.trip?.vehicle ?? null;
  const carName = car
    ? [[car.make, car.model].filter(Boolean).join(" "), car.color && car.color !== "Unspecified" ? car.color.toLowerCase() : null]
        .filter(Boolean)
        .join(", ")
    : "";
  const noShow = noShowTier === "no_show";
  const lapsed = booking.cancel_reason?.trim() === "Payment hold expired";

  const headline = declined
    ? isDriver
      ? `You declined ${passenger}'s request`
      : `${driver} declined your request`
    : noShow
      ? isDriver
        ? `${passenger} didn't show up`
        : "You were marked as a no-show"
      : lapsed
        ? isDriver
          ? `${passenger} didn't pay in time`
          : "Your seat hold ran out"
      : cancelledBy === viewerId
        ? isDriver
          ? `You cancelled ${passenger}'s seat`
          : "You cancelled your seat"
        : cancelledBy === booking.passenger_id
          ? `${passenger} cancelled their seat`
          : cancelledBy === booking.driver_id
            ? `${driver} cancelled your seat`
            : "This booking was cancelled";

  const stoppedAt = moment(booking.cancelled_at);
  const whenLine = stoppedAt ? `${declined ? "Declined" : "Cancelled"} ${stoppedAt}` : null;
  const reason = !noShow && !lapsed && booking.cancel_reason?.trim() ? booking.cancel_reason.trim() : null;
  const leaves = departureInstant(booking.trip?.departure_date, booking.trip?.departure_time);
  const tripOpen =
    !!booking.trip &&
    !["cancelled", "completed", "expired", "in_progress"].includes(booking.trip.status) &&
    (!leaves || leaves.getTime() > Date.now());
  const stillOn = booking.accepted_at
    ? `Your ride to ${destination} is still on.`
    : `Your ride to ${destination} is still open.`;
  const search = new URLSearchParams({ from: origin, to: destination }).toString();

  const steps: { label: string; at: string; stop?: boolean }[] = [
    { label: isDriver ? "Request received" : "Request sent", at: booking.created_at },
    ...(booking.accepted_at ? [{ label: isDriver ? "You accepted" : `${driver} accepted`, at: booking.accepted_at }] : []),
    ...(booking.paid_at ? [{ label: isDriver ? `${passenger} paid` : "You paid", at: booking.paid_at }] : []),
    ...(booking.cancelled_at ? [{ label: declined ? "Declined" : "Cancelled", at: booking.cancelled_at, stop: true }] : []),
  ];

  const people: { person: TripPerson | null; role: "Driver" | "Passenger"; id: string }[] = [
    { person: booking.driver, role: "Driver", id: booking.driver_id },
    { person: booking.passenger, role: "Passenger", id: booking.passenger_id },
  ];

  return (
    <Wrap>
      <Hero aria-labelledby="stopped-head">
        <ArtSlot>
          <RideStoppedArt />
        </ArtSlot>
        <HeroText>
          <Chip $tone={status.tone}>
            <StatusIcon size={16} weight="bold" />
            {status.label}
          </Chip>
          <h2 id="stopped-head">{headline}</h2>
          {whenLine && <p className="when">{whenLine}</p>}
          {reason && (
            <p className="reason">
              <Speech size={16} aria-hidden />
              <span>
                <VisuallyHidden>Reason: </VisuallyHidden>
                {reason}
              </span>
            </p>
          )}
          <MoneyNote>
            <Lock size={20} aria-hidden />
            {moneyLine}
          </MoneyNote>
          {!isDriver ? (
            <HeroAct as={Link} href={`/home?${search}`} $primary>
              <MagnifyingGlass size={20} aria-hidden />
              Find another ride to {destination}
            </HeroAct>
          ) : tripOpen ? (
            <>
              <p className="still">{stillOn}</p>
              <HeroAct as={Link} href={`/ride/${booking.trip_id}`}>
                <Car size={20} aria-hidden />
                Manage your ride
              </HeroAct>
            </>
          ) : null}
        </HeroText>
      </Hero>

      <Columns>
        <Stack>
          <Panel aria-labelledby="ride-head">
            <SectionHead id="ride-head">The ride</SectionHead>
            <Road>
              <span>{origin}</span>
              <i aria-hidden />
              <span className="to">to</span>
              <span>{destination}</span>
            </Road>
            <Facts>
              <li>
                <b>{date}</b> at <b>{time}</b>
              </li>
              <li>{seats}</li>
              {booking.booking_reference && <li>{booking.booking_reference}</li>}
            </Facts>
          </Panel>

          <Panel aria-labelledby="people-head">
            <SectionHead id="people-head">On this ride</SectionHead>
            <People>
              {people.map(({ person, role, id }) => {
                const name = person?.full_name || (role === "Driver" ? "Driver" : "Passenger");
                return (
                  <Person key={role}>
                    <Avatar name={name} src={person?.avatar_url} size={48} />
                    <div>
                      <div className="name">
                        <span>{name}</span>
                        <VerifiedMark verified={person?.is_verified} />
                        {id === viewerId && <YouTag>You</YouTag>}
                      </div>
                      <div className="role">
                        {role === "Driver" ? (
                          <>
                            <span>{carName ? `Driver · ${carName}` : "Driver"}</span>
                            {car?.plate_number && <Plate>{car.plate_number}</Plate>}
                          </>
                        ) : (
                          <span>Passenger · {seats}</span>
                        )}
                      </div>
                    </div>
                  </Person>
                );
              })}
            </People>
          </Panel>
        </Stack>

        <Stack>
          <Panel aria-labelledby="fare-head">
            <SectionHead id="fare-head">Fare</SectionHead>
            <Lines>
              {!isDriver && (
                <div>
                  <dt>{seatLine}</dt>
                  <dd>{formatCurrency(subtotal)}</dd>
                </div>
              )}
              {fee != null && !isDriver && (
                <div>
                  <dt>Kipita service fee</dt>
                  <dd>{formatCurrency(fee)}</dd>
                </div>
              )}
              <div className="total">
                <dt>{isDriver ? seatLine : "Fare"}</dt>
                <dd>{formatCurrency(fare)}</dd>
              </div>
              <div>
                <dt>{isDriver ? `Paid by ${passenger}` : "Charged"}</dt>
                <dd>{booking.paid_at ? formatCurrency(fare) : "Nothing"}</dd>
              </div>
              {booking.refunded_amount != null && (
                <div>
                  <dt>Refunded</dt>
                  <dd>
                    {formatCurrency(booking.refunded_amount)}
                    <small>{booking.refund_to === "mpesa" ? "to M-Pesa" : "to Kipita wallet"}</small>
                  </dd>
                </div>
              )}
            </Lines>
          </Panel>

          <Panel aria-labelledby="steps-head">
            <SectionHead id="steps-head">What happened</SectionHead>
            <Steps>
              {steps.map((s) => (
                <li key={s.label} data-state={s.stop ? "stop" : "done"}>
                  <span className="dot" aria-hidden>
                    {s.stop ? <X size={16} weight="bold" /> : <Check size={16} weight="bold" />}
                  </span>
                  {s.label}
                  <time dateTime={s.at}>{capital(moment(s.at))}</time>
                </li>
              ))}
            </Steps>
          </Panel>
        </Stack>
      </Columns>
    </Wrap>
  );
}
