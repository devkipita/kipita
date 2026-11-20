"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import styled, { css } from "styled-components";
import { Check, Clock, Lock } from "@/components/icons";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatCurrency } from "@/lib/trips/format";
import { markNoShowAction } from "@/lib/trips/booking-actions";
import {
  boardByHandAction,
  boardWithCodeAction,
  getBoardingStatusAction,
  type BoardingRow,
} from "@/lib/trips/boarding-actions";

/* ── Shared pieces ───────────────────────────────────────────────────────────── */

const Card = styled.section`
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 20px;
  background: ${nocturne.surface};

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.45;
    color: ${nocturne.muted};
  }
`;

const focusRing = css`
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

/* ── Passenger: the pickup code ──────────────────────────────────────────────── */

const Digits = styled.output`
  display: flex;
  gap: 10px;

  span {
    display: grid;
    place-items: center;
    width: 52px;
    height: 68px;
    border-radius: 14px;
    background: ${nocturne.surface2};
    color: ${nocturne.cream};
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 36px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
`;

/** The passenger reads this out to the driver when they get in. Shown only while the booking is paid and not yet boarded. */
export function PickupCodeCard({ code }: { code: string }) {
  return (
    <Card aria-label="Pickup code">
      <h2>Your pickup code</h2>
      <Digits aria-label={`Pickup code ${code.split("").join(" ")}`}>
        {code.split("").map((d, i) => (
          <span key={i} aria-hidden>
            {d}
          </span>
        ))}
      </Digits>
      <p>Tell your driver this code when you get in. It tells Kipita you were picked up. Don&rsquo;t share it before then.</p>
    </Card>
  );
}

/* ── Driver: the boarding list ───────────────────────────────────────────────── */

export type BoardingSummary = {
  loaded: boolean;
  /** Passengers who paid and haven't boarded or been reported as no-shows. */
  waiting: number;
  boarded: number;
  /** What the boarded passengers will pay the driver, in KES. */
  earning: number;
};

export type Boarding = {
  rows: BoardingRow[];
  summary: BoardingSummary;
  error: string;
  reload: () => Promise<void>;
};

/** Loads the driver's boarding list and keeps it fresh. `enabled` is false for passengers and for rides that are over. */
export function useBoarding(tripId: string | null | undefined, enabled: boolean): Boarding {
  const [rows, setRows] = useState<BoardingRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!tripId) return;
    const result = await getBoardingStatusAction(tripId);
    if (result.ok) {
      setRows(result.rows);
      setError("");
    } else {
      setError(result.error);
    }
    setLoaded(true);
  }, [tripId]);

  useEffect(() => {
    if (!enabled || !tripId) return;
    void reload();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 20_000);
    return () => clearInterval(timer);
  }, [enabled, tripId, reload]);

  const summary = useMemo<BoardingSummary>(() => {
    let waiting = 0;
    let boarded = 0;
    let earning = 0;
    for (const r of rows) {
      if (r.state === "waiting") waiting += 1;
      if (r.state === "boarded") {
        boarded += 1;
        earning += r.earning;
      }
    }
    return { loaded, waiting, boarded, earning };
  }, [rows, loaded]);

  return { rows, summary, error, reload };
}

const List = styled.ul`
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Person = styled.li`
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  background: ${nocturne.surface2};
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  b {
    display: block;
    font-size: 16px;
    color: ${nocturne.cream};
  }
  small {
    display: block;
    margin-top: 2px;
    font-size: 13px;
    color: ${nocturne.muted};
  }
`;

const State = styled.span<{ $tone: "go" | "wait" | "off" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  background: ${({ $tone }) => ($tone === "go" ? nocturne.green : "transparent")};
  color: ${({ $tone }) => ($tone === "go" ? nocturne.onGreen : $tone === "off" ? nocturne.muted : nocturne.cream)};
  border: 2px solid ${({ $tone }) => ($tone === "go" ? "transparent" : $tone === "off" ? nocturne.muted : nocturne.cream)};
`;

const Row = styled.form`
  display: flex;
  gap: 8px;
`;

const CodeInput = styled.input`
  flex: 1;
  min-width: 0;
  min-height: 48px;
  padding: 0 14px;
  border: 2px solid ${nocturne.surface};
  border-radius: 14px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.3em;
  text-align: center;
  font-variant-numeric: tabular-nums;

  &::placeholder {
    letter-spacing: 0;
    font-size: 15px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
  ${focusRing}
`;

const TextInput = styled(CodeInput)`
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
  text-align: left;
`;

const Go = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 18px;
  border: 2px solid transparent;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.55;
    cursor: progress;
  }
  ${focusRing}
`;

const Links = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
`;

const LinkBtn = styled.button`
  min-height: 36px;
  padding: 0;
  border: 0;
  background: none;
  color: ${nocturne.accent};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: progress;
  }
  ${focusRing}
`;

const Problem = styled.p`
  && {
    color: ${nocturne.danger};
    font-weight: 700;
  }
`;

function CheckIn({ row, tripId, onDone }: { row: BoardingRow; tripId: string; onDone: () => Promise<void> }) {
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [manual, setManual] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<"code" | "hand" | "noshow" | null>(null);
  const [, startTransition] = useTransition();
  const first = row.passengerName.split(" ")[0];
  const noShowOpen = row.noShowFrom != null && Date.now() >= new Date(row.noShowFrom).getTime();

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setWorking("code");
    startTransition(async () => {
      const result = await boardWithCodeAction(row.bookingId, tripId, code);
      if (!result.ok) {
        setError(result.error);
        setCode("");
        setWorking(null);
        return;
      }
      await onDone();
      setWorking(null);
    });
  }

  function submitHand(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setWorking("hand");
    startTransition(async () => {
      const result = await boardByHandAction(row.bookingId, tripId, note);
      if (!result.ok) {
        setError(result.error);
        setWorking(null);
        return;
      }
      await onDone();
      setWorking(null);
    });
  }

  function reportNoShow() {
    setError("");
    setWorking("noshow");
    startTransition(async () => {
      const result = await markNoShowAction(row.bookingId);
      if (!result.ok) {
        setError(result.error);
        setWorking(null);
        return;
      }
      await onDone();
      setWorking(null);
    });
  }

  return (
    <>
      {row.codeLocked ? (
        <Problem>Too many wrong codes. Ask {first} to read the code from their booking, or mark them on board by hand.</Problem>
      ) : (
        <Row onSubmit={submitCode}>
          <CodeInput
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            placeholder="4-digit code"
            aria-label={`Pickup code from ${row.passengerName}`}
          />
          <Go type="submit" disabled={working !== null || code.length !== 4} aria-busy={working === "code"}>
            {working === "code" ? <ButtonOrb job="committing" /> : null}
            Check in
          </Go>
        </Row>
      )}

      {manual && (
        <Row onSubmit={submitHand}>
          <TextInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder={`Why can't ${first} give the code?`}
            aria-label={`Why you are marking ${row.passengerName} on board by hand`}
          />
          <Go type="submit" disabled={working !== null || note.trim().length < 3} aria-busy={working === "hand"}>
            {working === "hand" ? <ButtonOrb job="committing" /> : null}
            Mark on board
          </Go>
        </Row>
      )}

      {error && <Problem role="alert">{error}</Problem>}

      <Links>
        <LinkBtn type="button" onClick={() => setManual((on) => !on)} aria-expanded={manual} disabled={working !== null}>
          {manual ? "Use the code instead" : "Can't give the code? Mark on board by hand"}
        </LinkBtn>
        {noShowOpen && (
          <LinkBtn type="button" onClick={reportNoShow} disabled={working !== null} aria-busy={working === "noshow"}>
            {first} didn&rsquo;t show up
          </LinkBtn>
        )}
      </Links>
    </>
  );
}

/**
 * The driver checks each paid passenger in with the code on their booking. Start is locked by the database until
 * everyone is on board or reported as a no-show; this panel is how the driver gets there.
 */
export function BoardingPanel({ tripId, board }: { tripId: string; board: Boarding }) {
  const { rows, summary, error, reload } = board;
  if (!summary.loaded && !error) return null;
  // Nothing to check in: no paid passengers (or the list could not load, which the driver cannot fix).
  if (rows.length === 0) return null;

  return (
    <Card aria-label="Check passengers in">
      <h2>Check passengers in</h2>
      <p>
        {summary.waiting > 0
          ? "Ask each passenger for the 4-digit code on their booking. You can start once everyone is on board or reported as a no-show."
          : "Everyone is accounted for. You can start the trip."}
      </p>
      <List>
        {rows.map((row) => (
          <Person key={row.bookingId}>
            <Head>
              <span>
                <b>{row.passengerName}</b>
                <small>
                  {row.seats} {row.seats === 1 ? "seat" : "seats"}
                  {row.pickup ? ` · ${row.pickup}` : ""}
                </small>
              </span>
              {row.state === "boarded" ? (
                <State $tone="go">
                  <Check size={14} weight="bold" /> On board
                </State>
              ) : row.state === "no_show" ? (
                <State $tone="off">No-show</State>
              ) : (
                <State $tone="wait">
                  <Clock size={14} /> Waiting
                </State>
              )}
            </Head>
            {row.state === "boarded" && row.method === "manual" && (
              <p>
                <Lock size={14} /> Marked by hand. We check these before paying you.
              </p>
            )}
            {row.state === "waiting" && <CheckIn row={row} tripId={tripId} onDone={reload} />}
          </Person>
        ))}
      </List>
      {error && <Problem role="alert">{error}</Problem>}
    </Card>
  );
}

/** The check-in list for a ride page that is not showing a single booking (the driver's own ride page). */
export function OwnerBoarding({ tripId }: { tripId: string }) {
  const board = useBoarding(tripId, true);
  return <BoardingPanel tripId={tripId} board={board} />;
}

/* ── Driver: slide to end the trip ───────────────────────────────────────────── */

const Track = styled.div<{ $busy: boolean }>`
  position: relative;
  height: 60px;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  overflow: hidden;
  user-select: none;
  touch-action: none;
  opacity: ${({ $busy }) => ($busy ? 0.7 : 1)};
`;

const Label = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 52px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 800;
  pointer-events: none;
`;

const Knob = styled.button`
  position: absolute;
  top: 4px;
  left: 4px;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 50%;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  cursor: grab;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
  ${focusRing}
`;

/**
 * Ending a ride moves money (each boarded passenger's fare starts its release timer), so it takes a deliberate
 * drag, not a tap. Keyboard and screen-reader users press Enter or Space on the knob instead.
 */
export function SlideToComplete({
  label,
  busyLabel,
  busy,
  onComplete,
}: {
  label: string;
  busyLabel: string;
  busy: boolean;
  onComplete: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const origin = useRef(0);
  const KNOB = 52;

  const maxX = () => Math.max(0, (track.current?.clientWidth ?? 0) - KNOB - 8);

  function down(e: React.PointerEvent<HTMLButtonElement>) {
    if (busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    origin.current = e.clientX - x;
    setDragging(true);
  }
  function move(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    setX(Math.min(maxX(), Math.max(0, e.clientX - origin.current)));
  }
  function up() {
    if (!dragging) return;
    setDragging(false);
    const done = x >= maxX() * 0.9 && maxX() > 0;
    setX(0);
    if (done) onComplete();
  }

  return (
    <Track ref={track} $busy={busy}>
      <Label>
        {busy ? (
          <>
            <ButtonOrb job="committing" />
            &nbsp;{busyLabel}
          </>
        ) : (
          label
        )}
      </Label>
      <Knob
        type="button"
        aria-label={label}
        disabled={busy}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onComplete();
          }
        }}
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? "none" : `transform ${dur.state} ${ease.standard}`,
        }}
      >
        <span aria-hidden>›››</span>
      </Knob>
    </Track>
  );
}

/** The line shown above the slider: what the driver will be paid, and when. */
export function earningsLine(summary: BoardingSummary, hours: number): string {
  const when = `about ${hours} ${hours === 1 ? "hour" : "hours"} after the trip ends, unless a passenger reports a problem`;
  if (!summary.loaded) return `Your earnings are paid ${when}.`;
  if (summary.boarded === 0) return "No passengers boarded, so there is nothing to pay out for this trip.";
  return `You'll be paid ${formatCurrency(summary.earning)} for ${summary.boarded} boarded ${summary.boarded === 1 ? "passenger" : "passengers"}, ${when}.`;
}
