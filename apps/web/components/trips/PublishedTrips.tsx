"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { AnimatePresence, m } from "motion/react";
import { Check, NavigationArrow, ShareForward, Warning } from "@/components/icons";
import { tween } from "@/lib/motion";
import { SITE } from "@/lib/site";
import { Chip } from "@/components/ui/Chip";
import { RollingNumber } from "@/components/ui/Counter";
import { PICKUP_WINDOW_MS, useShareLocation } from "@/lib/trips/live";
import { useAppMode } from "@/components/nav/AppShell";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { useConfirm } from "@/components/ui/ConfirmPop";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { cancelTripAction } from "@/lib/trips/booking-actions";
import { completeTripAction, startTripAction } from "@/lib/trips/trip-actions";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import type { PublishedTrip, SeatRider } from "@/lib/trips/types";
import type { TripRoute } from "@/lib/maps/types";
import { Act, Acts, Count, Depart, Meta, Road, Row, SeatTrack, SectionHead, Tag, fs } from "./RideRow";
import { assignSeats } from "./SeatMap";
import { RideHero } from "./RideHero";
import { SlideToComplete } from "./Boarding";
import { CancelRideArt } from "./TripsArt";

const SHOWN = 4;
const START_WINDOW_MS = 2 * 60 * 60 * 1000;

const Section = styled.section`
  display: grid;
  gap: 12px;
`;








const Cta = styled(Act)`
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};

  .label {
    display: inline-grid;
  }
  .label > * {
    grid-area: 1 / 1;
  }
`;

const Others = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 12px;
`;

const MoreRow = styled.div`
  display: flex;
  justify-content: center;
`;

const CancelAct = styled(Act)`
  background: ${({ theme }) => theme.color.errorContainer};
  color: ${({ theme }) => theme.color.onErrorContainer};
`;

const Err = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  font-size: ${fs.meta};
  font-weight: 600;
  color: ${nocturne.cream};

  svg {
    flex: none;
    color: ${nocturne.ctaBg};
  }
`;

const SlideSlot = styled.div`
  flex: 1 1 280px;
  min-width: 0;
`;

const Busy = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${nocturne.onGreenMuted};
  transition: opacity ${dur.state} ${ease.standard};
`;

type Job = "cancel" | "start" | "complete";

function departsAt(t: PublishedTrip) {
  return `${t.departure_date ?? "9999-12-31"}T${t.departure_time ?? "23:59"}`;
}

function departureMs(t: PublishedTrip): number | null {
  if (!t.departure_date) return null;
  const at = new Date(`${t.departure_date}T${t.departure_time ?? "00:00"}`).getTime();
  return Number.isFinite(at) ? at : null;
}

function leavesIn(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `Leaves in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `Leaves in ${hours} h`;
  return `Leaves in ${Math.round(hours / 24)} days`;
}





function cancelLead(trip: PublishedTrip): string {
  const riders = trip.riders ?? [];
  const people = riders.length;
  const paid = riders.filter((r) => r.state === "paid").length;
  if (people === 0) return "No one has booked a seat yet, so the ride just comes off Kipita.";
  const who =
    people === 1
      ? "Your 1 passenger loses their seat and gets a message."
      : `All ${people} passengers lose their seats and get a message.`;
  if (paid === 0) return who;
  const back =
    paid === people
      ? people === 1
        ? "They get their full fare back."
        : "Each one gets their full fare back."
      : paid === 1
        ? "The 1 who paid gets their full fare back."
        : `The ${paid} who paid get their full fare back.`;
  return `${who} ${back}`;
}

function riderNews(trip: PublishedTrip, rider: SeatRider): string {
  const first = rider.name.split(/\s+/)[0] || "A passenger";
  const slots = assignSeats(
    trip.seats_total,
    { paid: trip.paid_seats, booked: trip.awaiting_payment, requested: trip.pending_requests },
    trip.riders,
  );
  const n = slots.findIndex((s) => s.rider?.booking_id === rider.booking_id) + 1;
  const seats = `${rider.seats} ${rider.seats === 1 ? "seat" : "seats"}`;
  if (rider.state === "requested") return `${first} asked for ${seats}`;
  if (rider.state === "booked") return n > 0 ? `${first} booked seat ${n}` : `${first} booked ${seats}`;
  return n > 0 ? `${first} paid for seat ${n}` : `${first} paid for ${seats}`;
}

function seatLine(trip: PublishedTrip) {
  const parts = [`${trip.seats_taken} of ${trip.seats_total} seats booked`];
  if (trip.seats_taken > 0) {
    parts.push(trip.paid_seats >= trip.seats_taken ? "all paid" : `${trip.paid_seats} paid`);
  }
  if (trip.pending_requests > 0) parts.push(`${trip.pending_requests} to answer`);
  return parts.join(" · ");
}

function ShareLocation({ tripId }: { tripId: string }) {
  const { state, retry } = useShareLocation(tripId, true);
  if (state !== "denied" && state !== "failed") return null;
  return (
    <Act type="button" onClick={retry}>
      <NavigationArrow size={16} weight="bold" aria-hidden />
      {state === "denied" ? "Allow location so passengers can see you" : "Location didn't send. Try again"}
    </Act>
  );
}

export function PublishedTrips({
  initial,
  liveRoute,
}: {
  initial: PublishedTrip[];
  liveRoute?: Promise<TripRoute | null>;
}) {
  const router = useRouter();
  const { kycStatus, requireKyc } = useAppMode();
  const canVerify = kycStatus === "not_submitted" || kycStatus === "rejected";
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();
  const { ask, confirmNode } = useConfirm();
  const [cancelling, setCancelling] = useState<PublishedTrip | null>(null);
  const [asked, setAsked] = useState<PublishedTrip | null>(null);
  if (cancelling && cancelling !== asked) setAsked(cancelling);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    const soonest = items.reduce<number>((best, t) => {
      const at = departureMs(t);
      return at === null || at <= now ? best : Math.min(best, at - now);
    }, Number.POSITIVE_INFINITY);
    const timer = window.setTimeout(() => setNow(Date.now()), soonest <= 60 * 60 * 1000 ? 1000 : 30_000);
    return () => window.clearTimeout(timer);
  }, [items, now]);

  const ordered = useMemo(() => {
    const running = items.filter((t) => t.status === "in_progress");
    const rest = items
      .filter((t) => t.status !== "in_progress")
      .sort((a, b) => departsAt(a).localeCompare(departsAt(b)));
    return [...running, ...rest];
  }, [items]);

  const [news, setNews] = useState<{ key: string; text: string } | null>(null);
  const seenRiders = useRef<Map<string, string> | null>(null);
  const lead = ordered[0];

  useEffect(() => {
    const riders = lead?.riders ?? [];
    const map = new Map(riders.map((r) => [r.booking_id, r.state]));
    const before = seenRiders.current;
    seenRiders.current = map;
    if (!before || !lead) return;
    const changed = riders.filter((r) => before.get(r.booking_id) !== r.state);
    const latest = changed[changed.length - 1];
    if (!latest) return;
    setNews({ key: `${latest.booking_id}-${latest.state}`, text: riderNews(lead, latest) });
    const timer = window.setTimeout(() => setNews(null), 8000);
    return () => window.clearTimeout(timer);
  }, [lead]);

  if (ordered.length === 0) return null;

  const [hero, ...others] = ordered;
  const shown = expanded ? others : others.slice(0, SHOWN);
  const hidden = others.length - shown.length;

  function cancel(trip: PublishedTrip) {
    setCancelling(null);
    setBusy(trip.id);
    setJob("cancel");
    setError("");
    startTransition(async () => {
      const result = await cancelTripAction(trip.id);
      if (!result.ok) {
        setError(result.error);
        setBusy(null);
        setJob(null);
        return;
      }
      setItems((prev) => prev.filter((t) => t.id !== trip.id));
      setBusy(null);
      setJob(null);
      router.refresh();
    });
  }

  async function start(trip: PublishedTrip, anchor: Element) {
    const unpaid = trip.awaiting_payment + trip.pending_requests;
    const ok = await ask(anchor, {
      title: unpaid > 0 ? `Start ride and drop ${unpaid} unpaid ${unpaid === 1 ? "seat" : "seats"}?` : "Start ride?",
      yes: "Start ride",
      no: "Not yet",
    });
    if (!ok) return;

    setBusy(trip.id);
    setJob("start");
    setError("");
    startTransition(async () => {
      const result = await startTripAction(trip.id);
      if (!result.ok) {
        setError(result.error);
        setBusy(null);
        setJob(null);
        return;
      }
      setItems((prev) =>
        prev.map((t) =>
          t.id === trip.id ? { ...t, status: "in_progress", pending_requests: 0, awaiting_payment: 0 } : t,
        ),
      );
      setBusy(null);
      setJob(null);
      router.refresh();
    });
  }

  function complete(trip: PublishedTrip) {
    setBusy(trip.id);
    setJob("complete");
    setError("");
    startTransition(async () => {
      const result = await completeTripAction(trip.id);
      if (!result.ok) {
        setError(result.error);
        setBusy(null);
        setJob(null);
        return;
      }
      setItems((prev) => prev.filter((t) => t.id !== trip.id));
      setBusy(null);
      setJob(null);
      router.refresh();
    });
  }

  async function share(trip: PublishedTrip) {
    const url = `${SITE.websiteUrl}/ride/${trip.id}`;
    const when = [formatTripDate(trip.departure_date), formatTripTime(trip.departure_time)].filter(Boolean).join(" ");
    const text = `Seats from ${trip.from_location} to ${trip.to_location}${when ? `, ${when}` : ""}. ${formatCurrency(trip.price_per_seat)} a seat on Kipita.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${trip.from_location} to ${trip.to_location}`, text, url });
      } catch {
        return;
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      return;
    }
  }

  const running = hero.status === "in_progress";
  const held = hero.status === "awaiting_approval";
  const at = departureMs(hero);
  const until = at === null ? 0 : at - now;
  const startable = !held && (at === null || until <= START_WINDOW_MS);
  const pickupSoon = !running && !held && hero.paid_seats > 0 && at !== null && until <= PICKUP_WINDOW_MS;
  const working = busy === hero.id;
  const booked = hero.paid_seats + hero.awaiting_payment;

  let primary: React.ReactNode = null;
  if (running) {
    primary = (
      <SlideSlot>
        <SlideToComplete
          label="Slide to end ride"
          busyLabel="Ending ride…"
          busy={working && job === "complete"}
          onComplete={() => complete(hero)}
        />
      </SlideSlot>
    );
  } else if (held) {
    primary = canVerify ? (
      <Cta type="button" onClick={() => requireKyc()}>
        Finish verification
      </Cta>
    ) : null;
  } else if (startable) {
    primary = (
      <Cta
        type="button"
        onClick={(e) => start(hero, e.currentTarget)}
        disabled={working}
        aria-busy={working && job === "start"}
      >
        {working && job === "start" ? (
          <>
            <ButtonOrb job="committing" /> Starting ride
          </>
        ) : (
          "Start ride"
        )}
      </Cta>
    );
  } else {
    primary = (
      <Cta type="button" onClick={() => void share(hero)} aria-live="polite">
        {copied ? <Check size={20} aria-hidden /> : <ShareForward size={20} aria-hidden />}
        <span className="label">
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={copied ? "copied" : "share"}
              initial={{ opacity: 0, filter: "blur(2px)" }}
              animate={{ opacity: 1, filter: "blur(0px)", transition: tween.enter }}
              exit={{ opacity: 0, filter: "blur(2px)", transition: tween.exit }}
            >
              {copied ? "Link copied" : "Share ride"}
            </m.span>
          </AnimatePresence>
        </span>
      </Cta>
    );
  }

  return (
    <Section aria-labelledby="driving-head">
      <SectionHead id="driving-head">
        {running ? "Driving now" : "Next ride you drive"}
        {ordered.length > 1 && (
          <Count>
            <RollingNumber value={ordered.length} /> published
          </Count>
        )}
      </SectionHead>
      {confirmNode}
      {asked ? (
        <ConfirmSheet
          open={cancelling !== null}
          title="Cancel this ride?"
          lead={cancelLead(asked)}
          art={<CancelRideArt />}
          quote={`${asked.from_location} to ${asked.to_location} · ${formatTripDate(asked.departure_date)}, ${formatTripTime(asked.departure_time)}`}
          yes="Cancel ride"
          no="Keep ride"
          danger
          onClose={() => setCancelling(null)}
          onConfirm={() => cancel(asked)}
        />
      ) : null}

      {error && (
        <Err role="alert">
          <Warning size={20} aria-hidden />
          {error}
        </Err>
      )}

      <RideHero
        trip={hero}
        running={running}
        route={running ? liveRoute : undefined}
        status={
          running ? (
            <Tag $tone="live">
              <i data-pulse aria-hidden />
              Under way
            </Tag>
          ) : held ? (
            <Tag $tone="pay">{canVerify ? "Not live yet" : "ID in review"}</Tag>
          ) : booked >= hero.seats_total ? (
            <Tag $tone="wait">Full</Tag>
          ) : null
        }
        countdown={
          running || held || at === null || until <= 0
            ? null
            : startable
              ? { target: at, lead: "Leaves in" }
              : { target: at - START_WINDOW_MS, lead: "Starts in" }
        }
        news={news}
        actions={
          <>
            {primary}
            {(running || pickupSoon) && <ShareLocation tripId={hero.id} />}
          </>
        }
        trailing={
          running ? null : (
            <CancelAct
              type="button"
              onClick={() => setCancelling(hero)}
              disabled={working}
              aria-busy={working && job === "cancel"}
            >
              Cancel ride
            </CancelAct>
          )
        }
        busy={
          working && job === "cancel" ? (
            <Busy role="status">
              <ButtonOrb job="committing" on="green" /> Cancelling ride
            </Busy>
          ) : null
        }
      />

      {others.length > 0 && (
        <Others>
          {shown.map((trip) => {
            const going = trip.status === "in_progress";
            const waiting = trip.status === "awaiting_approval";
            const full = trip.seats_taken >= trip.seats_total;
            const doing = busy === trip.id;
            const paid = Math.min(trip.paid_seats, trip.seats_total);
            const taken = Math.min(Math.max(trip.seats_taken, paid), trip.seats_total);
            const seats = Array.from({ length: trip.seats_total }, (_, i) =>
              i < paid ? "paid" : i < taken ? "taken" : "free",
            );
            const tripAt = departureMs(trip);
            const tripUntil = tripAt === null ? 0 : tripAt - now;
            const canStart = !waiting && (tripAt === null || tripUntil <= START_WINDOW_MS);
            const label = `${trip.from_location} to ${trip.to_location}`;

            return (
              <Row key={trip.id} $mood={going ? "running" : "plain"} aria-label={label}>
                <Depart>
                  <span>{formatTripDate(trip.departure_date) || "Date to confirm"}</span>
                  <b>{formatTripTime(trip.departure_time) || "Time to confirm"}</b>
                  {going ? (
                    <Tag $tone="live">
                      <i data-pulse aria-hidden />
                      Under way
                    </Tag>
                  ) : waiting ? (
                    <Tag $tone="pay">{canVerify ? "Not live yet" : "ID in review"}</Tag>
                  ) : full ? (
                    <Tag $tone="wait">Full</Tag>
                  ) : (
                    <Tag $tone="go">Open for booking</Tag>
                  )}
                </Depart>

                <div>
                  <Road>
                    <span>{trip.from_location}</span>
                    <i aria-hidden />
                    <span>{trip.to_location}</span>
                  </Road>
                  <Meta>
                    <span>
                      <SeatTrack $total={trip.seats_total} aria-hidden>
                        {seats.map((s, i) => (
                          <i key={i} data-seat={s} />
                        ))}
                      </SeatTrack>
                      {seatLine(trip)}
                    </span>
                    <span>
                      <b>{formatCurrency(trip.price_per_seat)}</b> a seat
                    </span>
                    {!going && !canStart && tripAt !== null && <span suppressHydrationWarning>{leavesIn(tripUntil)}</span>}
                  </Meta>
                </div>

                <Acts>
                  {going ? (
                    <SlideSlot>
                      <SlideToComplete
                        label="Slide to end ride"
                        busyLabel="Ending ride…"
                        busy={doing && job === "complete"}
                        onComplete={() => complete(trip)}
                      />
                    </SlideSlot>
                  ) : canStart ? (
                    <Act
                      $primary
                      type="button"
                      onClick={(e) => start(trip, e.currentTarget)}
                      disabled={doing}
                      aria-busy={doing && job === "start"}
                    >
                      {doing && job === "start" ? (
                        <>
                          <ButtonOrb job="committing" /> Starting ride
                        </>
                      ) : (
                        "Start ride"
                      )}
                    </Act>
                  ) : null}
                  <Act as={Link} href={`/ride/${trip.id}`}>
                    Open ride
                  </Act>
                  {!going && (
                    <CancelAct
                      type="button"
                      onClick={() => setCancelling(trip)}
                      disabled={doing}
                      aria-label={`Cancel ride, ${label}`}
                    >
                      Cancel ride
                    </CancelAct>
                  )}
                </Acts>
              </Row>
            );
          })}
          {(hidden > 0 || expanded) && (
            <MoreRow>
              <Chip type="button" onClick={() => setExpanded((on) => !on)}>
                {expanded ? "Show fewer rides" : `Show all ${others.length} other rides`}
              </Chip>
            </MoreRow>
          )}
        </Others>
      )}
    </Section>
  );
}
