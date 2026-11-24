"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { AnimatePresence, m } from "motion/react";
import { Clock, Star, Warning } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { VerifiedMark } from "@/components/alerts/VerifiedMark";
import { RollingNumber } from "@/components/ui/Counter";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { useConfirm } from "@/components/ui/ConfirmPop";
import { tween } from "@/lib/motion";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import { answerSeatRequestAction, seatRequestsAction } from "@/lib/trips/request-actions";
import { useBookingStream } from "@/lib/trips/realtime";
import type { Booking } from "@/lib/trips/types";

const List = styled.div`
  display: grid;
  gap: 12px;
  padding-top: 16px;
`;

const Card = styled(m.article)`
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 20px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
`;

const Head = styled.div`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;

  .who {
    display: grid;
    min-width: 0;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .name b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
    font-weight: 700;
    line-height: 24px;
    color: ${nocturne.cream};
  }
  small {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    line-height: 20px;
    color: ${nocturne.muted};
  }
  small svg {
    color: ${nocturne.star};
  }
`;

const Due = styled.span<{ $late: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ theme, $late }) => ($late ? theme.color.errorContainer : theme.color.warningContainer)};
  color: ${({ theme, $late }) => ($late ? theme.color.onErrorContainer : theme.color.onWarningContainer)};
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;

  svg {
    flex: none;
  }
`;

const Trip = styled.div`
  display: grid;
  gap: 4px;

  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    line-height: 24px;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  span {
    font-size: 14px;
    line-height: 20px;
    color: ${nocturne.muted};
  }
`;

const Seats = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 12px;
  border-radius: 12px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  font-size: 14px;
  color: ${nocturne.muted};

  .glyphs {
    display: inline-flex;
    gap: 4px;
    color: ${nocturne.accent};
  }
  b {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  .earn {
    margin-left: auto;
  }
`;

const Btns = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;

  @media (max-width: 600px) {
    > * {
      flex: 1;
    }
  }
`;

const Btn = styled.button<{ $main?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: ${({ $main, theme }) => ($main ? nocturne.green : theme.color.errorContainer)};
  color: ${({ $main, theme }) => ($main ? nocturne.onGreen : theme.color.onErrorContainer)};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    filter ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      filter: brightness(0.94);
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  &:disabled {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${nocturne.muted2};
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Err = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: ${nocturne.danger};

  svg {
    flex: none;
  }
`;

const Empty = styled.p`
  margin: 16px 0 0;
  padding: 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  font-size: 15px;
  line-height: 24px;
  color: ${nocturne.muted};
`;

function SeatGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <rect x="7" y="3" width="10" height="11" rx="3" />
      <rect x="5" y="13" width="14" height="6" rx="2" />
      <path d="M8 19v2M16 19v2" />
    </svg>
  );
}

function dueLabel(expiresAt: string | null, now: number): { text: string; late: boolean } {
  if (!expiresAt) return { text: "Needs your answer", late: false };
  const left = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(left)) return { text: "Needs your answer", late: false };
  if (left <= 0) return { text: "Expiring now", late: true };
  const mins = Math.ceil(left / 60000);
  if (mins < 60) return { text: `Answer within ${mins} min`, late: mins <= 10 };
  const hours = Math.round(mins / 60);
  return { text: `Answer within ${hours} h`, late: false };
}

export function SeatRequests({
  initial,
  viewerId,
  onCount,
  empty,
}: {
  initial: Booking[];
  viewerId: string;
  onCount?: (n: number) => void;
  empty?: ReactNode;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<{ id: string; job: "accept" | "decline" } | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [, startTransition] = useTransition();
  const { ask, confirmNode } = useConfirm();

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    onCount?.(items.length);
  }, [items.length, onCount]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const arrivals = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(arrivals.current), []);

  const receive = useCallback((row: { id: string; status: string }, event: "INSERT" | "UPDATE") => {
    if (row.status !== "requested") {
      setItems((prev) => prev.filter((b) => b.id !== row.id));
      return;
    }
    if (event === "UPDATE") return;

    window.clearTimeout(arrivals.current);
    arrivals.current = window.setTimeout(() => {
      void seatRequestsAction().then((fresh) => {
        setItems((prev) => {
          const known = new Set(prev.map((b) => b.id));
          const added = fresh.filter((b) => !known.has(b.id)).reverse();
          return added.length ? [...added, ...prev] : prev;
        });
      });
    }, 250);
  }, []);

  useBookingStream(`seat-requests:${viewerId}`, viewerId ? `driver_id=eq.${viewerId}` : null, receive);

  async function answer(booking: Booking, decision: "accept" | "decline", anchor: Element) {
    if (decision === "decline") {
      const ok = await ask(anchor, {
        title: "Decline this request?",
        yes: "Decline request",
        no: "Keep request",
        danger: true,
      });
      if (!ok) return;
    }

    setBusy({ id: booking.id, job: decision });
    setError("");
    startTransition(async () => {
      const result = await answerSeatRequestAction(booking.id, decision);
      if (!result.ok) {
        setError(result.error);
        setBusy(null);
        return;
      }
      setItems((prev) => prev.filter((b) => b.id !== booking.id));
      setBusy(null);
      router.refresh();
    });
  }

  if (items.length === 0) return empty ? <>{empty}</> : <Empty>No seat requests right now.</Empty>;

  return (
    <>
      {confirmNode}
      {error && (
        <Err role="alert">
          <Warning size={20} aria-hidden />
          {error}
        </Err>
      )}
      <List>
        <AnimatePresence mode="popLayout">
          {items.map((booking, index) => {
            const p = booking.passenger;
            const name = p?.full_name || "Kipita passenger";
            const seats = booking.seats_booked;
            const seatWord = seats === 1 ? "seat" : "seats";
            const working = busy?.id === booking.id;
            const earn = booking.service_fee != null ? booking.total_price - booking.service_fee : booking.total_price;
            const due = dueLabel(booking.expires_at, now);
            const when = [
              formatTripDate(booking.trip?.departure_date ?? null) || "Date to confirm",
              formatTripTime(booking.trip?.departure_time ?? null) || "time to confirm",
            ].join(" · ");

            return (
              <Card
                key={booking.id}
                aria-label={`Seat request from ${name}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { ...tween.enter, delay: index < 6 ? index * 0.035 : 0 } }}
                exit={{ opacity: 0, scale: 0.98, transition: tween.exit }}
              >
                <Head>
                  <Avatar name={name} src={p?.avatar_url} size={40} />
                  <span className="who">
                    <span className="name">
                      <b>{name}</b>
                      <VerifiedMark verified={p?.is_verified} />
                    </span>
                    <small>
                      {p?.rating ? (
                        <>
                          <Star size={16} weight="fill" aria-hidden />
                          {p.rating.toFixed(1)}
                          {p.total_trips ? ` · ${p.total_trips} trips` : ""}
                        </>
                      ) : (
                        "New to Kipita"
                      )}
                    </small>
                  </span>
                  <Due $late={due.late}>
                    <Clock size={16} aria-hidden />
                    {due.text}
                  </Due>
                </Head>

                <Trip>
                  <b>
                    {booking.trip?.from_location ?? "Pickup to confirm"} to{" "}
                    {booking.trip?.to_location ?? "drop-off to confirm"}
                  </b>
                  <span>{when}</span>
                </Trip>

                <Seats>
                  <span className="glyphs" role="img" aria-label={`${seats} ${seatWord} requested`}>
                    {Array.from({ length: Math.min(seats, 8) }, (_, i) => (
                      <SeatGlyph key={i} />
                    ))}
                  </span>
                  <span>
                    <b>{formatCurrency(booking.total_price)}</b> for{" "}
                    <RollingNumber value={seats} /> {seatWord}
                  </span>
                  <span className="earn">
                    You receive <b>{formatCurrency(earn)}</b>
                  </span>
                </Seats>

                <Btns>
                  <Btn type="button" onClick={(e) => answer(booking, "decline", e.currentTarget)} disabled={working}>
                    {working && busy?.job === "decline" ? (
                      <>
                        <ButtonOrb job="committing" on="surface" /> Declining request
                      </>
                    ) : (
                      "Decline request"
                    )}
                  </Btn>
                  <Btn
                    type="button"
                    $main
                    onClick={(e) => answer(booking, "accept", e.currentTarget)}
                    disabled={working}
                    aria-busy={working}
                  >
                    {working && busy?.job === "accept" ? (
                      <>
                        <ButtonOrb job="committing" /> Accepting request
                      </>
                    ) : (
                      `Accept ${seats} ${seatWord}`
                    )}
                  </Btn>
                </Btns>
              </Card>
            );
          })}
        </AnimatePresence>
      </List>
    </>
  );
}
