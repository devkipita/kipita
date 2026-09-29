"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled, { css } from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import { ArrowLeft, SealCheck as BadgeCheck, Briefcase, CalendarBlank as CalendarDays, Car, CheckCircle as CheckCircle2, Clock, CircleNotch as Loader2, MapPin, Minus, MusicNote as Music, PawPrint, Phone, Plus, DeviceMobile as Smartphone, Star, Users, SpeakerSimpleX as VolumeX } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import {
  currentUserIdAction,
  reserveSeatAction,
  type BookingResult,
} from "@/lib/bookings";
import { PaymentDrawer } from "./PaymentDrawer";
import { formatRideDate, formatRideTime, ratingLabel, type RideDetail } from "@/lib/ride-detail";
import { safeTelHref } from "@/lib/security/url";
import { formatKes } from "@/lib/rides";
import type { Profile } from "@/lib/auth/types";

const Wrap = styled(ContentWidth)`
  padding-block: 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: flex-start;
  padding: 8px 14px 8px 10px;
  border-radius: 999px;
  font-size: 0.86rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSoft};
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.text};
  }
`;

const Card = styled.section`
  background: ${({ theme }) => theme.color.surface};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  padding: 20px;
`;

const Kind = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  margin-bottom: 16px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: ${({ theme }) => theme.color.primaryContainer};
  color: ${({ theme }) => theme.color.onPrimaryContainer};
`;

/* Route timeline — a dot, a rail and a pin, mirroring the mobile ride screen. */
const Route = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 14px;
`;

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 6px;

  .node {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: ${({ theme }) => theme.tone.mint.bg};
  }
  .node i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.primary};
  }
  .line {
    flex: 1;
    width: 2px;
    min-height: 26px;
    margin: 5px 0;
    border-radius: 1px;
    background: ${({ theme }) => theme.color.line};
  }
  svg {
    color: ${({ theme }) => theme.color.dangerText};
  }
`;

const Stops = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;

  small {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.color.muted};
  }
  b {
    display: block;
    font-size: 1.12rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.color.text};
  }
  span.point {
    display: block;
    margin-top: 2px;
    font-size: 0.83rem;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
`;

const Chip = styled.span<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  background: ${({ theme, $accent }) =>
    $accent ? theme.color.primaryContainer : theme.color.surface2};
  color: ${({ theme, $accent }) =>
    $accent ? theme.color.onPrimaryContainer : theme.color.textSoft};
`;

const Person = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  .who {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0 0 8px;
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
`;

const Note = styled.p`
  margin: 16px 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSoft};
`;

const PhoneRow = styled.a`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface2};
  color: ${({ theme }) => theme.color.text};
  font-weight: 700;
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.color.line};
  }
  svg {
    color: ${({ theme }) => theme.color.primary};
  }
`;

const Vehicle = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    flex: none;
    border-radius: 14px;
    background: ${({ theme }) => theme.tone.blue.bg};
    color: ${({ theme }) => theme.tone.blue.on};
  }
  small {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.color.muted};
  }
  b {
    display: block;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }
  span {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const Bar = styled(Card)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
`;

const Seats = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surface2};

  button {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: ${({ theme }) => theme.color.text};
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  button:not(:disabled):hover {
    background: ${({ theme }) => theme.color.surface};
  }
  b {
    min-width: 58px;
    text-align: center;
    font-size: 0.86rem;
    font-weight: 800;
  }
`;

const primaryCta = css`
  flex: 1;
  min-width: 190px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  height: 52px;
  padding: 0 22px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font-size: 0.98rem;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.primaryDark};
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
  svg.spin {
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Primary = styled.button`
  ${primaryCta}
`;

const PrimaryLink = styled(Link)`
  ${primaryCta}
`;

const Banner = styled.div<{ $tone: "ok" | "bad" | "info" }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $tone }) =>
    $tone === "ok"
      ? theme.tone.mint.bg
      : $tone === "bad"
        ? theme.color.dangerBg
        : theme.color.surface};
  color: ${({ theme, $tone }) =>
    $tone === "ok"
      ? theme.tone.mint.on
      : $tone === "bad"
        ? theme.color.dangerText
        : theme.color.text};

  svg {
    flex: none;
    margin-top: 1px;
  }
  b {
    display: block;
    font-weight: 800;
  }
  p {
    margin: 4px 0 0;
    font-size: 0.88rem;
    line-height: 1.5;
    opacity: 0.85;
  }
`;

function preferenceChips(prefs: RideDetail["preferences"]) {
  return [
    prefs.luggage && { icon: Briefcase, label: "Luggage" },
    prefs.pets && { icon: PawPrint, label: "Pets welcome" },
    prefs.silent_ride && { icon: VolumeX, label: "Quiet ride" },
    prefs.music && { icon: Music, label: "Music" },
  ].filter(Boolean) as { icon: typeof Briefcase; label: string }[];
}

/**
 * The screen a ride notification opens — a driver's posted trip or a
 * passenger's open request, mirroring `apps/mobile/src/app/ride/[id].tsx`.
 *
 * Signed-out visitors can read everything (both tables are world-readable) and
 * are sent to sign-in only when they act.
 */
export function RideDetailView({
  ride,
  profile,
}: {
  ride: RideDetail;
  profile: Profile | null;
}) {
  const router = useRouter();
  const isTrip = ride.kind === "trip";
  const person = isTrip ? ride.driver : ride.passenger;
  const maxSeats = isTrip ? Math.max(1, ride.seats_available) : ride.seats_needed;

  const [seats, setSeats] = useState(1);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [payingFor, setPayingFor] = useState<{
    bookingId: string;
    total: number;
  } | null>(null);
  // Kept outside `payingFor` so closing the drawer doesn't lose it.
  const [payerId, setPayerId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const date = formatRideDate(isTrip ? ride.departure_date : ride.preferred_date);
  const time = formatRideTime(isTrip ? ride.departure_time : ride.preferred_time);
  const prefs = preferenceChips(ride.preferences);
  const isOwn = !!profile && !!person && profile.id === person.id;
  const soldOut = isTrip && ride.seats_available < 1;
  const closed = isTrip
    ? !["posted", "active"].includes(ride.status)
    : ride.status !== "pending";

  function reserve() {
    if (!isTrip) return;
    startTransition(async () => {
      const booked = await reserveSeatAction(ride.id, seats);
      setResult(booked);
      if (!booked.ok) return;

      // The edge function checks the booking belongs to this users.id, so it
      // has to come from the server rather than the profile prop (which can be
      // a synthesized record carrying the auth id).
      const userId = await currentUserIdAction();
      if (userId) {
        setPayerId(userId);
        setPayingFor({ bookingId: booked.bookingId, total: booked.total });
      }
    });
  }

  return (
    <>
      <Wrap $max={860}>
        <Back href="/notifications">
          <ArrowLeft size={17} /> Notifications
        </Back>

        <Card>
          <Kind>{isTrip ? "Ride available" : "Ride request"}</Kind>
          <Route>
            <Rail>
              <span className="node">
                <i />
              </span>
              <span className="line" />
              <MapPin size={18} />
            </Rail>
            <Stops>
              <div>
                <small>From</small>
                <b>{ride.from_location}</b>
                {isTrip && ride.pickup_point && (
                  <span className="point">Pickup: {ride.pickup_point}</span>
                )}
              </div>
              <div>
                <small>To</small>
                <b>{ride.to_location}</b>
                {isTrip && ride.dropoff_point && (
                  <span className="point">Drop-off: {ride.dropoff_point}</span>
                )}
              </div>
            </Stops>
          </Route>

          <Chips>
            {date && (
              <Chip>
                <CalendarDays size={15} /> {date}
              </Chip>
            )}
            {time && (
              <Chip>
                <Clock size={15} /> {time}
              </Chip>
            )}
            {isTrip ? (
              <>
                <Chip $accent>{formatKes(ride.price_per_seat)} / seat</Chip>
                <Chip>
                  <Users size={15} />
                  {ride.seats_available} of {ride.seats_total} left
                </Chip>
              </>
            ) : (
              <Chip $accent>
                <Users size={15} />
                {ride.seats_needed} seat{ride.seats_needed === 1 ? "" : "s"} needed
              </Chip>
            )}
            {prefs.map(({ icon: Icon, label }) => (
              <Chip key={label}>
                <Icon size={15} /> {label}
              </Chip>
            ))}
          </Chips>

          {isTrip && ride.description && <Note>{ride.description}</Note>}
        </Card>

        {person && (
          <Card>
            <Person>
              <Avatar name={person.full_name ?? "Kipita user"} src={person.avatar_url} size={64} />
              <div className="who">
                <h2>{person.full_name?.trim() || (isTrip ? "Kipita driver" : "Kipita passenger")}</h2>
                <Chips style={{ marginTop: 0 }}>
                  <Chip $accent={!!person.is_verified}>
                    <BadgeCheck size={15} />
                    {person.is_verified ? "Verified" : "Unverified"}
                  </Chip>
                  <Chip>
                    <Star size={15} />
                    {ratingLabel(person.rating, person.total_trips)}
                  </Chip>
                </Chips>
              </div>
            </Person>
            {safeTelHref(person.phone) && (
              <PhoneRow href={safeTelHref(person.phone) as string}>
                <Phone size={18} />
                {person.phone}
              </PhoneRow>
            )}
          </Card>
        )}

        {isTrip && ride.vehicle && (
          <Card>
            <Vehicle>
              <span className="icon">
                <Car size={22} />
              </span>
              <div>
                <small>Vehicle</small>
                <b>
                  {[ride.vehicle.make, ride.vehicle.model, ride.vehicle.year]
                    .filter(Boolean)
                    .join(" ")}
                </b>
                <span>
                  {[ride.vehicle.color, ride.vehicle.plate_number]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </Vehicle>
          </Card>
        )}

        {result?.ok && (
          <Banner $tone="ok">
            <CheckCircle2 size={20} />
            <div>
              <b>
                {paid ? "Seat confirmed" : "Seat held"}
                {result.reference ? ` · ${result.reference}` : ""}
              </b>
              <p>
                {result.seats} seat{result.seats === 1 ? "" : "s"} ·{" "}
                {formatKes(result.total)}.{" "}
                {paid
                  ? "Paid — we hold your fare until the trip is done, then release it to your driver."
                  : "Pay with M-Pesa to confirm; the seat is held until you do."}
              </p>
            </div>
          </Banner>
        )}

        {result && !result.ok && (
          <Banner $tone="bad">
            <Smartphone size={20} />
            <div>
              <b>Couldn&apos;t hold that seat</b>
              <p>{result.error}</p>
            </div>
          </Banner>
        )}

        {renderAction()}
      </Wrap>

      {payingFor && payerId && (
        <PaymentDrawer
          open
          bookingId={payingFor.bookingId}
          userId={payerId}
          amount={payingFor.total}
          defaultPhone={profile?.phone}
          onClose={() => setPayingFor(null)}
          onPaid={() => {
            const paidBooking = payingFor.bookingId;
            setPaid(true);
            setPayingFor(null);
            router.push(`/trips/${paidBooking}`);
          }}
        />
      )}
    </>
  );

  // Declared after the JSX (hoisted) to keep the page structure readable —
  // the footer has six mutually exclusive states.
  function renderAction() {
    if (closed) {
      return (
        <Banner $tone="info">
          <Smartphone size={20} />
          <div>
            <b>{isTrip ? "This ride has closed" : "This request has closed"}</b>
            <p>Browse what&apos;s running now from your notifications.</p>
          </div>
        </Banner>
      );
    }

    if (isOwn) {
      return (
        <Banner $tone="info">
          <CheckCircle2 size={20} />
          <div>
            <b>This is your own post</b>
            <p>Manage it from the Kipita app.</p>
          </div>
        </Banner>
      );
    }

    if (!profile) {
      const next = encodeURIComponent(
        `/ride/${ride.id}${isTrip ? "" : "?kind=request"}`,
      );
      return (
        <Bar>
          <PrimaryLink href={`/auth/sign-in?next=${next}`}>
            Sign in to {isTrip ? "reserve a seat" : "respond"}
          </PrimaryLink>
        </Bar>
      );
    }

    // A driver answering a passenger request needs chat, which is app-only.
    if (!isTrip) {
      return (
        <Banner $tone="info">
          <Smartphone size={20} />
          <div>
            <b>Respond in the app</b>
            <p>
              Offering this passenger a ride opens a chat, which lives in the
              Kipita app for now.
            </p>
          </div>
        </Banner>
      );
    }

    // Held but not yet paid — let them reopen M-Pesa without re-reserving.
    if (result?.ok && !paid) {
      return (
        <Bar>
          <Primary
            type="button"
            onClick={() =>
              setPayingFor({
                bookingId: result.bookingId,
                total: result.total,
              })
            }
            disabled={pending || !payerId}
          >
            <Smartphone size={18} /> Pay {formatKes(result.total)}
          </Primary>
        </Bar>
      );
    }

    if (result?.ok) return null;

    return (
      <Bar>
        <Seats>
          <button
            type="button"
            onClick={() => setSeats((s) => Math.max(1, s - 1))}
            disabled={seats <= 1 || pending}
            aria-label="Fewer seats"
          >
            <Minus size={16} />
          </button>
          <b>
            {seats} seat{seats === 1 ? "" : "s"}
          </b>
          <button
            type="button"
            onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
            disabled={seats >= maxSeats || pending}
            aria-label="More seats"
          >
            <Plus size={16} />
          </button>
        </Seats>
        <Primary type="button" onClick={reserve} disabled={pending || soldOut}>
          {pending ? (
            <>
              <Loader2 className="spin" size={18} /> Holding…
            </>
          ) : soldOut ? (
            "Fully booked"
          ) : (
            `Reserve · ${formatKes(ride.price_per_seat * seats)}`
          )}
        </Primary>
      </Bar>
    );
  }
}
