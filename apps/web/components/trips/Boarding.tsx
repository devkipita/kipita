"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import styled, { css, keyframes } from "styled-components";
import { ArrowRight, ChatCircle, Check, Clock, Lock } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { RollingNumber } from "@/components/ui/Counter";
import { Shimmer } from "@/components/ui/Shimmer";
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
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  padding: 16px;
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
      <p>Give this to your driver when you get in.</p>
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
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Person = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};
`;

const PanelHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;

  .count {
    flex: none;
    font-size: 14px;
    font-weight: 700;
    color: ${nocturne.muted};
    font-variant-numeric: tabular-nums;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;

  > span:first-child {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 12px;

    > span {
      min-width: 0;
    }
  }

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

const Side = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
`;

const Talk = styled.button`
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: ${({ theme }) => theme.tone.green.bg};
  color: ${({ theme }) => theme.tone.green.on};
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (pointer: coarse) {
    &::after {
      content: "";
      position: absolute;
      inset: -4px;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: color-mix(in oklab, ${({ theme }) => theme.tone.green.bg} 85%, ${nocturne.green});
    }
  }
  &:active {
    transform: scale(0.97);
  }
  ${focusRing}
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const State = styled.span<{ $tone: "go" | "wait" | "off" }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  background: ${({ theme, $tone }) =>
    $tone === "go"
      ? theme.color.successContainer
      : $tone === "wait"
        ? theme.color.warningContainer
        : theme.color.surfaceContainerHighest};
  color: ${({ theme, $tone }) =>
    $tone === "go"
      ? theme.color.onSuccessContainer
      : $tone === "wait"
        ? theme.color.onWarningContainer
        : nocturne.muted};
`;

const Row = styled.form`
  display: flex;
  gap: 8px;
  min-width: 0;
`;

const CodeInput = styled.input`
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  background: ${({ theme }) => theme.color.surfaceContainerHighest};
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
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background-color: ${nocturne.greenDeep};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    background: ${({ theme }) => theme.color.surfaceContainerHighest};
    color: ${nocturne.muted};
    cursor: not-allowed;
  }
  &[aria-busy="true"] {
    background: ${nocturne.green};
    color: ${nocturne.onGreen};
    cursor: progress;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
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
  const [error, setError] = useState("");
  const [working, setWorking] = useState<"code" | "hand" | "noshow" | null>(null);
  const [, startTransition] = useTransition();
  const first = row.passengerName.split(" ")[0];
  const noShowOpen = row.noShowFrom != null && Date.now() >= new Date(row.noShowFrom).getTime();

  // Once the code locks, "Wrong code." is replaced by the by-hand form.
  useEffect(() => {
    if (row.codeLocked) setError("");
  }, [row.codeLocked]);

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setWorking("code");
    startTransition(async () => {
      const result = await boardWithCodeAction(row.bookingId, tripId, code);
      if (!result.ok) {
        setError(result.error);
        setCode("");
        // A wrong code may have used the last try. Reload so the by-hand route appears only then.
        if (result.wrongCode) await onDone();
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
        // The by-hand route. It is never offered while the code still works.
        <>
          <Problem>Code locked.</Problem>
          <Row onSubmit={submitHand}>
            <TextInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Reason"
              aria-label={`Reason for marking ${row.passengerName} on board by hand`}
            />
            <Go type="submit" disabled={working !== null || note.trim().length < 3} aria-busy={working === "hand"}>
              {working === "hand" ? <ButtonOrb job="committing" /> : null}
              Mark on board
            </Go>
          </Row>
        </>
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

      {error && <Problem role="alert">{error}</Problem>}

      {noShowOpen && (
        <Links>
          <LinkBtn type="button" onClick={reportNoShow} disabled={working !== null} aria-busy={working === "noshow"}>
            {first} didn&rsquo;t show up
          </LinkBtn>
        </Links>
      )}
    </>
  );
}

/**
 * The driver checks each paid passenger in with the code on their booking. Start is locked by the database until
 * everyone is on board or reported as a no-show; this panel is how the driver gets there.
 */
export function BoardingPanel({
  tripId,
  board,
  always = false,
  onMessage,
}: {
  tripId: string;
  board: Boarding;
  always?: boolean;
  onMessage?: (row: BoardingRow) => void;
}) {
  const { rows, summary, error, reload } = board;
  if (!always && ((!summary.loaded && !error) || rows.length === 0)) return null;

  if (!summary.loaded && !error) {
    return (
      <Card aria-label="Check passengers in" aria-busy="true">
        <PanelHead>
          <h2>Check passengers in</h2>
        </PanelHead>
        <List aria-hidden>
          {[0, 1].map((i) => (
            <Person key={i}>
              <Shimmer $w="55%" $h="16px" $r="6px" />
              <Shimmer $w="100%" $h="48px" $r="12px" />
            </Person>
          ))}
        </List>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card aria-label="Check passengers in">
        <PanelHead>
          <h2>Check passengers in</h2>
        </PanelHead>
        <p>Passengers show up here once they pay. When each one gets in, ask for their 4-digit pickup code.</p>
        {error && <Problem role="alert">{error}</Problem>}
      </Card>
    );
  }

  return (
    <Card aria-label="Check passengers in">
      <PanelHead>
        <h2>Check passengers in</h2>
        <span className="count">
          <RollingNumber value={summary.boarded} /> of {rows.length} on board
        </span>
      </PanelHead>
      <p>{summary.waiting > 0 ? "Ask each passenger for their code." : "Everyone is on board."}</p>
      <List>
        {rows.map((row) => (
          <Person key={row.bookingId}>
            <Head>
              <span className="who">
                <Avatar name={row.passengerName} src={row.avatarUrl} size={40} />
                <span>
                  <b>{row.passengerName}</b>
                  <small>
                    {row.seats} {row.seats === 1 ? "seat" : "seats"}
                    {row.pickup ? ` · ${row.pickup}` : ""}
                  </small>
                </span>
              </span>
              <Side>
                {onMessage && row.state !== "no_show" ? (
                  <Talk type="button" aria-label={`Message ${row.passengerName}`} onClick={() => onMessage(row)}>
                    <ChatCircle size={20} aria-hidden />
                  </Talk>
                ) : null}
                {row.state === "boarded" ? (
                  <State $tone="go">
                    <Check size={16} weight="bold" /> On board
                  </State>
                ) : row.state === "no_show" ? (
                  <State $tone="off">No-show</State>
                ) : (
                  <State $tone="wait">
                    <Clock size={16} /> Waiting
                  </State>
                )}
              </Side>
            </Head>
            {row.state === "boarded" && row.method === "manual" && (
              <p>
                <Lock size={16} /> Marked by hand. Held for review.
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
  return <BoardingPanel tripId={tripId} board={board} always />;
}

/* ── Driver: slide to end the trip ───────────────────────────────────────────── */

const nudge = keyframes`
  0%, 62%, 100% { transform: translateX(0); }
  72% { transform: translateX(6px); }
  82% { transform: translateX(0); }
  90% { transform: translateX(3px); }
`;

const KNOB = 52;

const Track = styled.div<{ $busy: boolean }>`
  position: relative;
  height: 60px;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  overflow: hidden;
  user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow ${dur.state} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.ink} 8%, transparent);
    }
  }
`;

const Fill = styled.span.attrs<{ $w: number; $dragging: boolean }>(({ $w, $dragging }) => ({
  style: {
    width: `${$w}px`,
    transition: $dragging ? "none" : `width ${dur.enter} ${ease.enter}`,
  },
}))`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: 999px;
  background: color-mix(in oklab, ${nocturne.ink} 18%, transparent);
  pointer-events: none;
`;

const Label = styled.span.attrs<{ $p: number }>(({ $p }) => ({
  style: { opacity: Math.max(0, 1 - $p * 1.4), transform: `translateX(${Math.round($p * 16)}px)` },
}))`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-left: ${KNOB}px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 800;
  pointer-events: none;
  transition:
    opacity ${dur.state} ${ease.standard},
    transform ${dur.state} ${ease.standard};
`;

const Knob = styled.button.attrs<{ $x: number; $dragging: boolean }>(({ $x, $dragging }) => ({
  style: {
    transform: `translateX(${$x}px)`,
    transition: $dragging ? "none" : `transform ${dur.enter} ${ease.enter}`,
  },
}))<{ $idle: boolean }>`
  position: absolute;
  top: 4px;
  left: 4px;
  display: grid;
  place-items: center;
  width: ${KNOB}px;
  height: ${KNOB}px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  box-shadow: ${nocturne.panelShadow};
  cursor: grab;
  touch-action: none;

  > span {
    display: grid;
    place-items: center;
    transition: transform ${dur.press} ${ease.standard};
  }
  svg {
    animation: ${({ $idle }) => ($idle ? css`${nudge} calc(${dur.max} * 6) ${ease.standard} infinite` : "none")};
  }
  &:active > span {
    transform: scale(0.92);
  }
  &:active {
    cursor: grabbing;
  }
  &:disabled {
    cursor: default;
  }
  ${focusRing}

  @media (prefers-reduced-motion: reduce) {
    svg {
      animation: none;
    }
    &:active > span {
      transform: none;
    }
  }
`;

function buzz(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

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
  const [sent, setSent] = useState(false);
  const origin = useRef(0);
  const armed = useRef(false);
  const wasBusy = useRef(false);

  const maxX = () => Math.max(0, (track.current?.clientWidth ?? 0) - KNOB - 8);
  const max = maxX();
  const progress = max > 0 ? Math.min(1, x / max) : 0;

  useEffect(() => {
    if (busy) {
      wasBusy.current = true;
      return;
    }
    if (wasBusy.current && sent) {
      wasBusy.current = false;
      setSent(false);
      setX(0);
    }
  }, [busy, sent]);

  function finish() {
    buzz([12, 40, 24]);
    setX(maxX());
    setSent(true);
    onComplete();
  }

  function down(e: React.PointerEvent<HTMLButtonElement>) {
    if (busy || sent) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    origin.current = e.clientX - x;
    armed.current = false;
    setDragging(true);
    buzz(8);
  }
  function move(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    const next = Math.min(maxX(), Math.max(0, e.clientX - origin.current));
    const past = next >= maxX() * 0.9;
    if (past !== armed.current) {
      armed.current = past;
      if (past) buzz(14);
    }
    setX(next);
  }
  function up() {
    if (!dragging) return;
    setDragging(false);
    if (armed.current && maxX() > 0) {
      finish();
      return;
    }
    setX(0);
  }

  return (
    <Track ref={track} $busy={busy}>
      <Fill $w={x + KNOB + 8} $dragging={dragging} />
      <Label $p={busy || sent ? 0 : progress}>
        {busy || sent ? (
          <>
            <ButtonOrb job="committing" />
            {busyLabel}
          </>
        ) : (
          label
        )}
      </Label>
      <Knob
        type="button"
        aria-label={label}
        disabled={busy || sent}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            finish();
          }
        }}
        $x={x}
        $dragging={dragging}
        $idle={!dragging && !busy && !sent && x === 0}
      >
        <span>
          {sent || busy ? <Check size={24} weight="bold" aria-hidden /> : <ArrowRight size={24} weight="bold" aria-hidden />}
        </span>
      </Knob>
    </Track>
  );
}

/** The line shown above the slider: what the driver will be paid, and on what condition. */
export function earningsLine(summary: BoardingSummary): string {
  if (!summary.loaded) return "Paid to your wallet when you end the ride.";
  if (summary.boarded === 0) return "No one boarded, so nothing to pay out.";
  return `You'll be paid ${formatCurrency(summary.earning)} for ${summary.boarded} boarded ${summary.boarded === 1 ? "passenger" : "passengers"} when you end the ride.`;
}
