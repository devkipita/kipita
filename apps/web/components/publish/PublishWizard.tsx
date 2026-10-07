"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import {
  ArrowRight,
  Calendar,
  Car,
  Check,
  Clock,
  MapPin,
  Minus,
  NavigationArrow,
  Plus,
  Repost,
  Warning,
} from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { createTripAction } from "@/lib/home/posts";

const STEPS = ["Route", "Schedule", "Details"] as const;

const Page = styled.main`
  min-height: 100vh;
  padding: 48px max(34px, calc((100% - 1000px) / 2)) 120px;
  background: ${nocturne.bg};

  @media (max-width: 640px) {
    padding: 28px 18px calc(90px + env(safe-area-inset-bottom));
  }
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
  font-size: clamp(38px, 4.6vw, 58px);
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: ${nocturne.cream};
`;

const Lead = styled.p`
  max-width: 54ch;
  margin: 0;
  font-size: 18px;
  line-height: 1.6;
  color: ${nocturne.muted};
`;

const Progress = styled.ol`
  position: relative;
  display: flex;
  justify-content: space-between;
  max-width: 560px;
  margin: 40px 0 28px;
  padding: 0;
  list-style: none;

  &::before {
    content: "";
    position: absolute;
    top: 17px;
    left: 16%;
    right: 16%;
    height: 2px;
    background: ${nocturne.line};
  }
`;

const Step = styled.li<{ $state: "done" | "current" | "todo" }>`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: ${({ $state }) =>
    $state === "todo" ? nocturne.muted3 : nocturne.accent};

  .dot {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 13px;
    background: ${({ $state }) =>
      $state === "todo" ? nocturne.surface2 : nocturne.accent};
    color: ${({ $state }) =>
      $state === "todo" ? nocturne.muted2 : nocturne.onGreen};
    border: 1px solid
      ${({ $state }) => ($state === "todo" ? nocturne.line : "transparent")};
  }
`;

const Card = styled.div`
  padding: 10px;
  border-radius: 28px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.cardBorder};
  box-shadow: ${nocturne.cardShadow};
`;

const Fields = styled.div`
  position: relative;
  padding: 18px;

  @media (max-width: 640px) {
    padding: 8px;
  }
`;

const Row = styled.label`
  display: block;
  margin-bottom: 10px;
  padding: 13px 16px;
  border-radius: 14px;
  background: ${nocturne.bg};
  border: 1px solid ${nocturne.line};
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: ${nocturne.accent};
  }

  .lbl {
    display: block;
    margin-left: 31px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  .ctl {
    display: flex;
    align-items: center;
    gap: 11px;
    color: ${nocturne.accent};
  }
  .ctl > svg {
    flex: none;
  }
  input {
    width: 100%;
    padding: 5px 0 0;
    border: none;
    background: transparent;
    color: ${nocturne.cream};
    font: inherit;
    font-size: 16px;
    font-weight: 600;
  }
  input:focus,
  input:focus-visible {
    outline: none;
  }
  input::placeholder {
    color: ${nocturne.muted3};
    font-weight: 400;
  }
`;

const Swap = styled.button`
  position: absolute;
  right: 33px;
  top: 78px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 4px solid ${nocturne.surface};
  border-radius: 50%;
  background: ${nocturne.sage};
  color: ${nocturne.greenDeep};
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: rotate(180deg);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
  @media (max-width: 640px) {
    right: 22px;
    top: 70px;
  }
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`;

const Stepper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: ${nocturne.bg};
  border: 1px solid ${nocturne.line};

  .label b {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .label span {
    font-size: 14px;
    color: ${nocturne.muted2};
  }
  .ctl {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  output {
    min-width: 26px;
    text-align: center;
    font-size: 17px;
    font-weight: 700;
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
  }
`;

const Round = styled.button`
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
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
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const MapBand = styled.div`
  position: relative;
  height: 220px;
  margin: 8px 0;
  overflow: hidden;
  border-radius: 18px;
  background:
    linear-gradient(26deg, transparent 48%, ${nocturne.surface} 49%, ${nocturne.surface} 51%, transparent 52%),
    linear-gradient(-40deg, transparent 48%, ${nocturne.surface} 49%, ${nocturne.surface} 52%, transparent 53%),
    ${nocturne.surface2};

  .road {
    position: absolute;
    height: 6px;
    border-radius: 10px;
    background: ${nocturne.surface};
    transform-origin: left;
  }
  .r1 {
    width: 110%;
    top: 55%;
    left: -5%;
    transform: rotate(-5deg);
  }
  .r2 {
    width: 60%;
    top: 35%;
    left: 21%;
    transform: rotate(33deg);
  }
  .r3 {
    width: 70%;
    top: 71%;
    left: 43%;
    transform: rotate(-46deg);
  }
  .pin {
    position: absolute;
    width: 18px;
    height: 18px;
    border: 5px solid ${nocturne.surface};
    border-radius: 50%;
  }
  .pin-a {
    left: 24%;
    top: 41%;
    background: ${nocturne.ctaBg};
  }
  .pin-b {
    right: 24%;
    bottom: 28%;
    background: ${nocturne.accent};
  }
  .car {
    position: absolute;
    left: 50%;
    top: 42%;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: ${nocturne.accent};
    color: ${nocturne.onGreen};
  }

  @media (max-width: 640px) {
    height: 170px;
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 14px 6px;

  small {
    font-size: 14px;
    color: ${nocturne.muted2};
  }

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Btns = styled.div`
  display: flex;
  gap: 10px;
  flex: none;
`;

const Ghost = styled.button`
  min-height: 50px;
  padding: 0 22px;
  border: 1px solid ${nocturne.line};
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
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Primary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 50px;
  padding: 0 26px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.2s ease;

  &:hover:not(:disabled) {
    filter: brightness(0.94);
  }
  &:disabled {
    opacity: 0.65;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
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
  gap: 9px;
  margin: 0 14px 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${nocturne.surface2};
  color: ${nocturne.cream};
  font-size: 15px;
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
  padding: 56px 28px;
  border-radius: 28px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.cardBorder};
  text-align: center;

  .tick {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    margin: 0 auto 18px;
    border-radius: 50%;
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  }
  h2 {
    margin: 0 0 10px;
    font-size: clamp(24px, 3vw, 32px);
    color: ${nocturne.cream};
  }
  p {
    max-width: 44ch;
    margin: 0 auto 24px;
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
  color: string;
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
  color: "",
};

export function PublishWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function patch(next: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...next }));
    setError(null);
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (draft.from.trim().length < 2) return "Where are you leaving from?";
      if (draft.to.trim().length < 2) return "Where are you heading?";
      if (draft.from.trim().toLowerCase() === draft.to.trim().toLowerCase())
        return "Pick two different towns.";
    }
    if (step === 1) {
      if (!draft.date) return "Choose a departure date.";
      if (!draft.time) return "Choose a departure time.";
    }
    if (step === 2) {
      const price = Number(draft.price);
      if (!Number.isFinite(price) || price <= 0)
        return "Set a fare above zero.";
    }
    return null;
  }

  function next() {
    const problem = validateStep();
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
        vehicle_color: draft.color.trim() || undefined,
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
            <Check size={30} />
          </span>
          <h2>Your ride is live</h2>
          <p>
            Passengers heading {draft.from} to {draft.to} can see it now. You
            will get a notification the moment someone books a seat.
          </p>
          <Primary type="button" onClick={() => router.push(`/ride/${doneId}`)}>
            View your ride <ArrowRight size={18} aria-hidden />
          </Primary>
        </Done>
      </Page>
    );
  }

  return (
    <Page>
      <Overline>Publish a ride</Overline>
      <Title>Where are you driving?</Title>
      <Lead>
        Share your route and we will find passengers going your way. Your exact
        address stays private until a booking is confirmed.
      </Lead>

      <Progress aria-label={`Step ${step + 1} of 3`}>
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <Step
              key={label}
              $state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="dot" aria-hidden>
                {state === "done" ? <Check size={16} /> : i + 1}
              </span>
              {label}
            </Step>
          );
        })}
      </Progress>

      <Card>
        {error && (
          <Err role="alert">
            <Warning size={18} aria-hidden />
            {error}
          </Err>
        )}

        <Fields>
          {step === 0 && (
            <>
              <Row>
                <span className="lbl">Leaving from</span>
                <span className="ctl">
                  <NavigationArrow size={20} aria-hidden />
                  <input
                    value={draft.from}
                    onChange={(e) => patch({ from: e.target.value })}
                    placeholder="Enter a town or landmark"
                    aria-label="Leaving from"
                    autoFocus
                  />
                </span>
              </Row>
              <Swap
                type="button"
                aria-label="Swap origin and destination"
                onClick={() => patch({ from: draft.to, to: draft.from })}
              >
                <Repost size={18} aria-hidden />
              </Swap>
              <Row>
                <span className="lbl">Going to</span>
                <span className="ctl">
                  <MapPin size={20} aria-hidden />
                  <input
                    value={draft.to}
                    onChange={(e) => patch({ to: e.target.value })}
                    placeholder="Where are you headed?"
                    aria-label="Going to"
                  />
                </span>
              </Row>
            </>
          )}

          {step === 1 && (
            <Pair>
              <Row>
                <span className="lbl">Departure date</span>
                <span className="ctl">
                  <Calendar size={20} aria-hidden />
                  <input
                    type="date"
                    value={draft.date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => patch({ date: e.target.value })}
                    aria-label="Departure date"
                  />
                </span>
              </Row>
              <Row>
                <span className="lbl">Departure time</span>
                <span className="ctl">
                  <Clock size={20} aria-hidden />
                  <input
                    type="time"
                    value={draft.time}
                    onChange={(e) => patch({ time: e.target.value })}
                    aria-label="Departure time"
                  />
                </span>
              </Row>
            </Pair>
          )}

          {step === 2 && (
            <>
              <Stepper>
                <span className="label">
                  <b>Seats on offer</b>
                  <span>How many passengers can join</span>
                </span>
                <span className="ctl">
                  <Round
                    type="button"
                    aria-label="One fewer seat"
                    disabled={draft.seats <= 1}
                    onClick={() => patch({ seats: draft.seats - 1 })}
                  >
                    <Minus size={16} aria-hidden />
                  </Round>
                  <output aria-live="polite">{draft.seats}</output>
                  <Round
                    type="button"
                    aria-label="One more seat"
                    disabled={draft.seats >= 8}
                    onClick={() => patch({ seats: draft.seats + 1 })}
                  >
                    <Plus size={16} aria-hidden />
                  </Round>
                </span>
              </Stepper>

              <Row>
                <span className="lbl">Fare per seat (KES)</span>
                <span className="ctl">
                  <Car size={20} aria-hidden />
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
              </Row>

              <Pair>
                <Row>
                  <span className="lbl">Car make</span>
                  <span className="ctl">
                    <Car size={20} aria-hidden />
                    <input
                      value={draft.make}
                      onChange={(e) => patch({ make: e.target.value })}
                      placeholder="Toyota"
                      aria-label="Car make"
                    />
                  </span>
                </Row>
                <Row>
                  <span className="lbl">Car model</span>
                  <span className="ctl">
                    <Car size={20} aria-hidden />
                    <input
                      value={draft.model}
                      onChange={(e) => patch({ model: e.target.value })}
                      placeholder="Axio"
                      aria-label="Car model"
                    />
                  </span>
                </Row>
              </Pair>
            </>
          )}
        </Fields>

        <MapBand aria-hidden>
          <span className="road r1" />
          <span className="road r2" />
          <span className="road r3" />
          <i className="pin pin-a" />
          <i className="pin pin-b" />
          <span className="car">
            <Car size={26} />
          </span>
        </MapBand>

        <Foot>
          <small>
            Your exact address stays private until a booking is confirmed.
          </small>
          <Btns>
            {step > 0 && (
              <Ghost type="button" onClick={() => setStep((s) => s - 1)}>
                Back
              </Ghost>
            )}
            <Primary type="button" onClick={next} disabled={pending}>
              {pending
                ? "Publishing…"
                : step === 2
                  ? "Publish ride"
                  : "Continue"}
              {!pending && <ArrowRight size={18} aria-hidden />}
            </Primary>
          </Btns>
        </Foot>
      </Card>
    </Page>
  );
}
