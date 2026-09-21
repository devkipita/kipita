"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import styled, { css } from "styled-components";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Minus,
  Music,
  PawPrint,
  Phone,
  Plus,
  Smartphone,
  Star,
  Users,
  VolumeX,
} from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { Avatar } from "@/components/profile/Avatar";
import { reserveSeatAction, type BookingResult } from "@/lib/bookings";
import { formatRideDate, formatRideTime, type RideDetail } from "@/lib/ride-detail";
import { formatKes } from "@/lib/rides";
import type { Profile } from "@/lib/auth/types";

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.bg};
`;

const Wrap = styled.main`
  max-width: 640px;
  margin: 0 auto;
  padding: 20px clamp(16px, 4vw, 28px) 72px;
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
  box-shadow: ${({ theme }) => theme.shadow.soft};
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

function ratingLabel(rating: number | null, trips: number | null) {
  const score = rating && rating > 0 ? rating.toFixed(1) : "New";
  return trips && trips > 0 ? `${score} · ${trips} trips` : score;
}

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
  const isTrip = ride.kind === "trip";
  const person = isTrip ? ride.driver : ride.passenger;
  const maxSeats = isTrip ? Math.max(1, ride.seats_available) : ride.seats_needed;

  const [seats, setSeats] = useState(1);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [pending, startTransition] = useTransition();

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
      setResult(await reserveSeatAction(ride.id, seats));
    });
  }

  return (
    <Page>
      <AppHeader
        name={profile?.full_name}
        avatarUrl={profile?.avatar_url}
        userId={profile?.id}
        showProfileChip={!!profile}
      />
      <Wrap>
        <Back href="/notifications">
          <ArrowLeft size={17} strokeWidth={2.4} /> Notifications
        </Back>

        <Card>
          <Kind>{isTrip ? "Ride available" : "Ride request"}</Kind>
          <Route>
            <Rail>
              <span className="node">
                <i />
              </span>
              <span className="line" />
              <MapPin size={18} strokeWidth={2.4} />
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
                <CalendarDays size={15} strokeWidth={2.4} /> {date}
              </Chip>
            )}
            {time && (
              <Chip>
                <Clock size={15} strokeWidth={2.4} /> {time}
              </Chip>
            )}
            {isTrip ? (
              <>
                <Chip $accent>{formatKes(ride.price_per_seat)} / seat</Chip>
                <Chip>
                  <Users size={15} strokeWidth={2.4} />
                  {ride.seats_available} of {ride.seats_total} left
                </Chip>
              </>
            ) : (
              <Chip $accent>
                <Users size={15} strokeWidth={2.4} />
                {ride.seats_needed} seat{ride.seats_needed === 1 ? "" : "s"} needed
              </Chip>
            )}
            {prefs.map(({ icon: Icon, label }) => (
              <Chip key={label}>
                <Icon size={15} strokeWidth={2.4} /> {label}
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
                    <BadgeCheck size={15} strokeWidth={2.4} />
                    {person.is_verified ? "Verified" : "Unverified"}
                  </Chip>
                  <Chip>
                    <Star size={15} strokeWidth={2.4} />
                    {ratingLabel(person.rating, person.total_trips)}
                  </Chip>
                </Chips>
              </div>
            </Person>
            {person.phone && (
              <PhoneRow href={`tel:${person.phone}`}>
                <Phone size={18} strokeWidth={2.4} />
                {person.phone}
              </PhoneRow>
            )}
          </Card>
        )}

        {isTrip && ride.vehicle && (
          <Card>
            <Vehicle>
              <span className="icon">
                <Car size={22} strokeWidth={2.2} />
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
            <CheckCircle2 size={20} strokeWidth={2.4} />
            <div>
              <b>
                Seat held{result.reference ? ` · ${result.reference}` : ""}
              </b>
              <p>
                {result.seats} seat{result.seats === 1 ? "" : "s"} ·{" "}
                {formatKes(result.total)}. Open the Kipita app to pay with M-Pesa
                and confirm — your seat is held until then.
              </p>
            </div>
          </Banner>
        )}

        {result && !result.ok && (
          <Banner $tone="bad">
            <Smartphone size={20} strokeWidth={2.4} />
            <div>
              <b>Couldn&apos;t hold that seat</b>
              <p>{result.error}</p>
            </div>
          </Banner>
        )}

        {renderAction()}
      </Wrap>
    </Page>
  );

  // Declared after the JSX (hoisted) to keep the page structure readable —
  // the footer has six mutually exclusive states.
  function renderAction() {
    if (closed) {
      return (
        <Banner $tone="info">
          <Smartphone size={20} strokeWidth={2.4} />
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
          <CheckCircle2 size={20} strokeWidth={2.4} />
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
          <Smartphone size={20} strokeWidth={2.4} />
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
            <Minus size={16} strokeWidth={2.6} />
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
            <Plus size={16} strokeWidth={2.6} />
          </button>
        </Seats>
        <Primary type="button" onClick={reserve} disabled={pending || soldOut}>
          {pending ? (
            <>
              <Loader2 className="spin" size={18} strokeWidth={2.4} /> Holding…
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
