"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import {
  ArrowRight,
  Car,
  CardStack,
  Check,
  HandCoins,
  MapPin,
  Minus,
  NavigationArrow,
  Plus,
  Repost,
  SealCheck,
  Users,
  Warning,
} from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { formatKes } from "@/lib/rides";
import { createTripAction } from "@/lib/home/posts";
import { PlaceModal, pushRecent, type PlaceField } from "@/components/home/PlaceModal";
import { DatePicker, TimePicker } from "./WhenPicker";

const STEPS = [
  { label: "Route", hint: "Where are you driving?" },
  { label: "Schedule", hint: "When do you leave?" },
  { label: "Details", hint: "Seats, fare and your car" },
] as const;

const TIME_PRESETS = ["06:00", "07:30", "09:00", "12:00", "15:00", "18:00"];
const FARE_PRESETS = [500, 800, 1200, 1600, 2000];

const Page = styled.main`
  min-height: 100vh;
  padding: 48px max(28px, calc((100% - 1120px) / 2)) 120px;
  background: ${nocturne.bg};

  @media (max-width: 640px) {
    padding: 24px 16px calc(96px + env(safe-area-inset-bottom));
  }
`;

const Head = styled.header`
  max-width: 640px;
  margin-bottom: 30px;
`;

const Overline = styled.span`
  display: inline-block;
  color: ${nocturne.ctaBg};
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 10px 0 10px;
  font-size: clamp(36px, 4.4vw, 54px);
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: ${nocturne.cream};
`;

const Lead = styled.p`
  margin: 0;
  font-size: 18px;
  line-height: 1.6;
  color: ${nocturne.muted};
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 28px;
  align-items: start;

  @media (max-width: 1000px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Progress = styled.ol`
  display: flex;
  gap: 10px;
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
`;

const Step = styled.li<{ $state: "done" | "current" | "todo" }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  .track {
    height: 5px;
    border-radius: 999px;
    background: ${({ $state }) =>
      $state === "todo" ? nocturne.line : nocturne.accent};
    transition: background 0.3s ease;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    font-weight: 700;
    color: ${({ $state }) =>
      $state === "todo" ? nocturne.muted2 : nocturne.cream};
  }
  .meta svg {
    color: ${nocturne.accent};
  }

  @media (max-width: 640px) {
    .meta span {
      display: ${({ $state }) => ($state === "current" ? "inline" : "none")};
    }
  }
`;

const Card = styled.div`
  padding: clamp(18px, 2.4vw, 28px);
  border-radius: 24px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.cardBorder};
  box-shadow: ${nocturne.cardShadow};
`;

const StepTitle = styled.h2`
  margin: 0 0 4px;
  font-size: 24px;
  color: ${nocturne.cream};
`;

const StepHint = styled.p`
  margin: 0 0 22px;
  font-size: 16px;
  color: ${nocturne.muted};
`;

const Stack = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const fieldBox = `
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 70px;
  padding: 10px 16px;
  border: 2px solid transparent;
  border-radius: 16px;
  background: ${nocturne.bg};
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
`;

const Picker = styled.button`
  ${fieldBox}

  > svg {
    flex: none;
    color: ${nocturne.accent};
  }
  &[data-tone="origin"] > svg {
    color: ${nocturne.ctaBg};
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .lbl {
    display: block;
    margin-bottom: 3px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  b {
    display: block;
    font-size: 17px;
    font-weight: 700;
    color: ${nocturne.cream};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  b[data-empty="true"] {
    color: ${nocturne.muted3};
    font-weight: 500;
  }
  &:hover {
    border-color: ${nocturne.line};
    background: ${nocturne.surface};
  }
  &:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

const Swap = styled.button`
  position: absolute;
  right: 18px;
  top: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-top: -22px;
  border: 4px solid ${nocturne.surface};
  border-radius: 50%;
  background: ${nocturne.sage};
  color: ${nocturne.greenDeep};
  cursor: pointer;
  transition: transform 0.25s ease;

  &:hover {
    transform: rotate(180deg);
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const Group = styled.fieldset`
  margin: 0;
  padding: 0;
  border: none;
`;

const Legend = styled.legend`
  padding: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${nocturne.muted2};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button<{ $on: boolean }>`
  min-height: 46px;
  padding: 0 16px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.accent : nocturne.line)};
  border-radius: 12px;
  background: ${({ $on }) => ($on ? nocturne.accent : nocturne.bg)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;

  &:hover {
    border-color: ${nocturne.accent};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

const NativeField = styled.label`
  ${fieldBox}
  cursor: text;

  > svg {
    flex: none;
    color: ${nocturne.accent};
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .lbl {
    display: block;
    margin-bottom: 3px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  input {
    width: 100%;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 17px;
    font-weight: 700;
    color: ${nocturne.cream};
    padding: 0;
  }
  input:focus,
  input:focus-visible {
    outline: none;
  }
  input::placeholder {
    color: ${nocturne.muted3};
    font-weight: 500;
  }
  &:focus-within {
    border-color: ${nocturne.accent};
    background: ${nocturne.surface};
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

const SeatsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 70px;
  padding: 10px 16px;
  border-radius: 16px;
  background: ${nocturne.bg};

  > svg {
    flex: none;
    color: ${nocturne.accent};
  }
  .text {
    flex: 1;
  }
  .lbl {
    display: block;
    margin-bottom: 3px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  b {
    font-size: 17px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  output {
    min-width: 24px;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
  }
`;

const Round = styled.button`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid ${nocturne.line};
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${nocturne.surface2};
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

const Hint = styled.p`
  margin: -2px 0 0 4px;
  font-size: 14px;
  color: ${nocturne.muted2};
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;

  @media (max-width: 560px) {
    flex-direction: column-reverse;
    align-items: stretch;
  }
`;

const Ghost = styled.button`
  min-height: 52px;
  padding: 0 24px;
  border: 1.5px solid ${nocturne.line};
  border-radius: 999px;
  background: transparent;
  color: ${nocturne.cream};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${nocturne.surface2};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

const Primary = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 28px;
  margin-left: auto;
  border: none;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.2s ease;

  &:hover:not(:disabled) {
    filter: brightness(0.94);
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
  @media (max-width: 560px) {
    margin-left: 0;
  }
`;

/* ── Live summary rail ── */

const Aside = styled.aside`
  position: sticky;
  top: calc(var(--sticky-top, 0px) + 20px);
  padding: 24px;
  border-radius: 24px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};

  @media (max-width: 1000px) {
    position: static;
  }

  h3 {
    margin: 0 0 18px;
    font-size: 19px;
    color: inherit;
  }
`;

const RouteLine = styled.div`
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 12px;
  margin-bottom: 20px;

  .rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 7px 0;
  }
  .rail i {
    width: 11px;
    height: 11px;
    border: 2px solid ${nocturne.lime};
    border-radius: 50%;
  }
  .rail span {
    flex: 1;
    width: 1px;
    min-height: 30px;
    background: rgba(255, 255, 255, 0.3);
  }
  .stops {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 22px;
    font-size: 17px;
    font-weight: 700;
  }
  .stops em {
    display: block;
    font-style: normal;
    font-size: 14px;
    font-weight: 500;
    color: ${nocturne.onGreenMuted};
  }
`;

const Facts = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px 16px;
  margin: 0 0 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 16px;

  dt {
    color: ${nocturne.onGreenMuted};
  }
  dd {
    margin: 0;
    text-align: right;
    font-weight: 700;
  }
`;

const Earnings = styled.div`
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);

  .label {
    display: block;
    font-size: 14px;
    color: ${nocturne.onGreenMuted};
  }
  .amount {
    display: block;
    margin-top: 4px;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .note {
    display: block;
    margin-top: 6px;
    font-size: 13px;
    color: ${nocturne.onGreenMuted};
  }
`;

const shake = keyframes`
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
`;

const Err = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  padding: 13px 15px;
  border-radius: 12px;
  background: ${nocturne.surface2};
  color: ${nocturne.cream};
  font-size: 16px;
  animation: ${shake} 0.3s ease;

  svg {
    flex: none;
    color: ${nocturne.ctaBg};
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Done = styled.div`
  max-width: 560px;
  margin: 40px auto;
  padding: 56px 28px;
  border-radius: 28px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.cardBorder};
  text-align: center;

  .tick {
    display: grid;
    place-items: center;
    width: 68px;
    height: 68px;
    margin: 0 auto 20px;
    border-radius: 50%;
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  }
  h2 {
    margin: 0 0 10px;
    font-size: clamp(26px, 3vw, 34px);
    color: ${nocturne.cream};
  }
  p {
    max-width: 44ch;
    margin: 0 auto 26px;
    font-size: 17px;
    line-height: 1.6;
    color: ${nocturne.muted};
  }
`;

type Draft = {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: string;
  make: string;
  model: string;
  plate: string;
};

const EMPTY: Draft = {
  from: "",
  to: "",
  date: "",
  time: "",
  seats: 3,
  price: "",
  make: "",
  model: "",
  plate: "",
};

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function prettyDate(value: string) {
  if (!value) return "Not set";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Not set";
  if (value === todayISO()) return "Today";
  if (value === plusDays(1)) return "Tomorrow";
  return d.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function PublishWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [placeField, setPlaceField] = useState<PlaceField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function patch(next: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...next }));
    setError(null);
  }

  const earnings = useMemo(() => {
    const p = Number(draft.price);
    return Number.isFinite(p) && p > 0 ? p * draft.seats : 0;
  }, [draft.price, draft.seats]);

  function problemWith(index: number): string | null {
    if (index === 0) {
      if (draft.from.trim().length < 2) return "Pick where you are leaving from.";
      if (draft.to.trim().length < 2) return "Pick where you are heading.";
      if (draft.from.trim().toLowerCase() === draft.to.trim().toLowerCase())
        return "Pick two different towns.";
    }
    if (index === 1) {
      if (!draft.date) return "Choose a departure date.";
      if (!draft.time) return "Choose a departure time.";
    }
    if (index === 2) {
      const price = Number(draft.price);
      if (!Number.isFinite(price) || price <= 0)
        return "Set a fare above zero.";
      // Car details only create a vehicle record together, and the plate is
      // the part a passenger actually needs at the kerb.
      const anyCar = draft.make.trim() || draft.model.trim() || draft.plate.trim();
      if (anyCar) {
        if (!draft.make.trim()) return "Add the car make.";
        if (!draft.model.trim()) return "Add the car model.";
        if (draft.plate.trim().length < 4)
          return "Add the number plate so passengers can find you.";
      }
    }
    return null;
  }

  function next() {
    const problem = problemWith(step);
    if (problem) {
      setError(problem);
      return;
    }
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    submit();
  }

  function submit() {
    startTransition(async () => {
      const result = await createTripAction({
        from_location: draft.from.trim(),
        to_location: draft.to.trim(),
        departure_date: draft.date,
        departure_time: draft.time,
        seats_total: draft.seats,
        price_per_seat: Number(draft.price),
        preferences: {
          luggage: true,
          pets: false,
          silent_ride: false,
          music: true,
          no_smoking: true,
        },
        vehicle_make: draft.make.trim() || undefined,
        vehicle_model: draft.model.trim() || undefined,
        vehicle_plate: draft.plate.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDoneId(result.id);
    });
  }

  if (doneId) {
    return (
      <Page>
        <Done>
          <span className="tick" aria-hidden>
            <Check size={32} />
          </span>
          <h2>Your ride is live</h2>
          <p>
            Passengers going {draft.from} to {draft.to} can see it now. We will
            let you know the moment someone books a seat.
          </p>
          <Primary type="button" onClick={() => router.push(`/ride/${doneId}`)}>
            View your ride <ArrowRight size={18} aria-hidden />
          </Primary>
        </Done>
      </Page>
    );
  }

  const current = STEPS[step];

  return (
    <Page>
      <Head>
        <Overline>Publish a ride</Overline>
        <Title>Turn your empty seats into fuel money.</Title>
        <Lead>
          Three short steps. Your exact address stays private until a booking is
          confirmed.
        </Lead>
      </Head>

      <Layout>
        <div>
          <Progress aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step ? "current" : "todo";
              return (
                <Step
                  key={s.label}
                  $state={state}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className="track" />
                  <span className="meta">
                    {state === "done" && <Check size={15} aria-hidden />}
                    <span>{s.label}</span>
                  </span>
                </Step>
              );
            })}
          </Progress>

          <Card>
            <StepTitle>{current.hint}</StepTitle>
            <StepHint>
              {step === 0 && "Pick your towns — passengers search by route."}
              {step === 1 && "Pick a day and a departure time."}
              {step === 2 && "Set how many seats you are offering and the fare."}
            </StepHint>

            {error && (
              <Err role="alert">
                <Warning size={19} aria-hidden />
                {error}
              </Err>
            )}

            {step === 0 && (
              <Stack>
                <Picker
                  type="button"
                  data-tone="origin"
                  onClick={() => setPlaceField("from")}
                >
                  <NavigationArrow size={21} aria-hidden />
                  <span className="text">
                    <span className="lbl">Leaving from</span>
                    <b data-empty={!draft.from}>
                      {draft.from || "Pick a town"}
                    </b>
                  </span>
                </Picker>

                <Swap
                  type="button"
                  aria-label="Swap origin and destination"
                  onClick={() => patch({ from: draft.to, to: draft.from })}
                >
                  <Repost size={19} aria-hidden />
                </Swap>

                <Picker type="button" onClick={() => setPlaceField("to")}>
                  <MapPin size={21} aria-hidden />
                  <span className="text">
                    <span className="lbl">Going to</span>
                    <b data-empty={!draft.to}>{draft.to || "Pick a town"}</b>
                  </span>
                </Picker>
              </Stack>
            )}

            {step === 1 && (
              <Stack>
                <DatePicker
                  value={draft.date}
                  onChange={(date) => patch({ date })}
                />
                <TimePicker
                  value={draft.time || "07:00"}
                  onChange={(time) => patch({ time })}
                />
              </Stack>
            )}

            {step === 2 && (
              <Stack>
                <SeatsRow>
                  <Users size={21} aria-hidden />
                  <span className="text">
                    <span className="lbl">Seats on offer</span>
                    <b>
                      {draft.seats} {draft.seats === 1 ? "seat" : "seats"}
                    </b>
                  </span>
                  <span className="stepper">
                    <Round
                      type="button"
                      aria-label="One fewer seat"
                      disabled={draft.seats <= 1}
                      onClick={() => patch({ seats: draft.seats - 1 })}
                    >
                      <Minus size={17} aria-hidden />
                    </Round>
                    <output aria-live="polite">{draft.seats}</output>
                    <Round
                      type="button"
                      aria-label="One more seat"
                      disabled={draft.seats >= 8}
                      onClick={() => patch({ seats: draft.seats + 1 })}
                    >
                      <Plus size={17} aria-hidden />
                    </Round>
                  </span>
                </SeatsRow>

                <Group>
                  <Legend>Fare per seat</Legend>
                  <Chips>
                    {FARE_PRESETS.map((f) => (
                      <Chip
                        key={f}
                        type="button"
                        $on={Number(draft.price) === f}
                        aria-pressed={Number(draft.price) === f}
                        onClick={() => patch({ price: String(f) })}
                      >
                        {formatKes(f)}
                      </Chip>
                    ))}
                  </Chips>
                </Group>

                <NativeField>
                  <HandCoins size={21} aria-hidden />
                  <span className="text">
                    <span className="lbl">Or set your own (KES)</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={draft.price}
                      onChange={(e) => patch({ price: e.target.value })}
                      placeholder="e.g. 1200"
                      aria-label="Fare per seat in Kenyan shillings"
                    />
                  </span>
                </NativeField>

                <Pair>
                  <NativeField>
                    <Car size={21} aria-hidden />
                    <span className="text">
                      <span className="lbl">Car make</span>
                      <input
                        value={draft.make}
                        onChange={(e) => patch({ make: e.target.value })}
                        placeholder="Toyota"
                        aria-label="Car make"
                      />
                    </span>
                  </NativeField>
                  <NativeField>
                    <Car size={21} aria-hidden />
                    <span className="text">
                      <span className="lbl">Car model</span>
                      <input
                        value={draft.model}
                        onChange={(e) => patch({ model: e.target.value })}
                        placeholder="Axio"
                        aria-label="Car model"
                      />
                    </span>
                  </NativeField>
                </Pair>

                <NativeField>
                  <CardStack size={21} aria-hidden />
                  <span className="text">
                    <span className="lbl">Number plate</span>
                    <input
                      value={draft.plate}
                      onChange={(e) =>
                        patch({ plate: e.target.value.toUpperCase() })
                      }
                      placeholder="KDA 123A"
                      maxLength={12}
                      autoCapitalize="characters"
                      spellCheck={false}
                      aria-label="Vehicle number plate"
                    />
                  </span>
                </NativeField>
                <Hint>
                  Passengers use the plate to find your car at the pickup point.
                </Hint>
              </Stack>
            )}

            <Foot>
              {step > 0 ? (
                <Ghost type="button" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Ghost>
              ) : (
                <span />
              )}
              <Primary type="button" onClick={next} disabled={pending}>
                {pending
                  ? "Publishing…"
                  : step === 2
                    ? "Publish ride"
                    : "Continue"}
                {!pending && <ArrowRight size={18} aria-hidden />}
              </Primary>
            </Foot>
          </Card>
        </div>

        <Aside aria-label="Your ride so far">
          <h3>Your ride so far</h3>

          <RouteLine>
            <span className="rail" aria-hidden>
              <i />
              <span />
              <i />
            </span>
            <span className="stops">
              <span>
                {draft.from || <em>Leaving from —</em>}
                {draft.from && <em>Origin</em>}
              </span>
              <span>
                {draft.to || <em>Going to —</em>}
                {draft.to && <em>Destination</em>}
              </span>
            </span>
          </RouteLine>

          <Facts>
            <dt>When</dt>
            <dd>
              {prettyDate(draft.date)}
              {draft.time ? ` · ${draft.time}` : ""}
            </dd>
            <dt>Seats</dt>
            <dd>{draft.seats}</dd>
            <dt>Fare</dt>
            <dd>{draft.price ? formatKes(Number(draft.price)) : "Not set"}</dd>
          </Facts>

          <Earnings>
            <span className="label">If every seat fills</span>
            <span className="amount">
              {earnings > 0 ? formatKes(earnings) : "—"}
            </span>
            <span className="note">
              <SealCheck size={14} aria-hidden /> Paid out after the journey
            </span>
          </Earnings>
        </Aside>
      </Layout>

      <PlaceModal
        field={placeField}
        from={draft.from}
        to={draft.to}
        originCoords={null}
        onFieldChange={setPlaceField}
        onPickTown={(field, town) => {
          patch({ [field]: town.name });
          setPlaceField(field === "from" ? "to" : null);
        }}
        onPickRoute={(fromName, toName) => {
          patch({ from: fromName, to: toName });
          pushRecent(toName);
          setPlaceField(null);
        }}
        onSearch={() => setPlaceField(null)}
        onClose={() => setPlaceField(null)}
        searchLabel="Done"
      />
    </Page>
  );
}
