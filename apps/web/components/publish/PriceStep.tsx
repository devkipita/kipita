"use client";

import { useRef, useState } from "react";
import styled, { css } from "styled-components";
import { fillOutcomes, judgePrice, wholeShillings, type PriceChoiceKey } from "@kipita/shared";
import { nocturne } from "@/lib/nocturne";
import { formatKes } from "@/lib/rides";
import { rangeFor, type QuoteState } from "./price";

const CHOICE_LABEL: Record<PriceChoiceKey, string> = {
  lower: "Lower",
  recommended: "Recommended",
  higher: "Higher",
  highest: "Highest",
};

const ring = css`
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Wrap = styled.div`
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 22px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Label = styled.div`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${nocturne.muted2};
`;

const Note = styled.p<{ $tone?: "danger" }>`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ $tone }) => ($tone === "danger" ? nocturne.danger : nocturne.muted2)};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ClassChip = styled.button<{ $on: boolean }>`
  min-height: 52px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 1px;
  border-radius: 14px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  text-align: left;
  cursor: pointer;
  ${ring}

  .name {
    font-size: 15px;
    font-weight: 700;
  }
  .examples {
    font-size: 12px;
    color: ${({ $on }) => ($on ? nocturne.onGreenMuted : nocturne.muted2)};
  }

  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.green};
    }
  }
`;

const Card = styled.div`
  padding: 16px 20px;
  border: 1.5px solid ${nocturne.line};
  border-radius: 16px;
  background: ${nocturne.surface};

  .kicker {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  .amount {
    margin-top: 2px;
    font-family: var(--font-manrope), inherit;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  .unit {
    margin-left: 6px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0;
    color: ${nocturne.muted2};
  }
  p {
    margin: 6px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${nocturne.muted2};
  }
`;

const Why = styled.details`
  margin-top: 8px;

  summary {
    display: inline-block;
    cursor: pointer;
    font-size: 13.5px;
    font-weight: 600;
    color: ${nocturne.muted2};
    text-decoration: underline;
    text-underline-offset: 3px;
    ${ring}
  }
  p {
    margin: 6px 0 0;
  }
`;

const Counter = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 14px;

  .count {
    min-width: 92px;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
`;

const CountButton = styled.button`
  width: 44px;
  height: 44px;
  border: 1.5px solid ${nocturne.line};
  border-radius: 50%;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  ${ring}

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const PickChip = styled.button<{ $on: boolean }>`
  min-width: 104px;
  min-height: 56px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border-radius: 14px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  cursor: pointer;
  ${ring}

  .tag {
    font-size: 12px;
    font-weight: 600;
    color: ${({ $on }) => ($on ? nocturne.onGreenMuted : nocturne.muted2)};
  }
  .kes {
    font-size: 16px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.green};
    }
  }
`;

const AmountBox = styled.div<{ $on: boolean; $bad: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 52px;
  padding: 0 14px;
  border: 1.5px solid ${({ $bad, $on }) => ($bad ? nocturne.danger : $on ? nocturne.green : nocturne.line)};
  border-radius: 14px;
  background: ${nocturne.surface};

  &:focus-within {
    border-color: ${({ $bad }) => ($bad ? nocturne.danger : nocturne.green)};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
  .unit {
    font-size: 15px;
    font-weight: 700;
    color: ${nocturne.muted2};
  }
  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    font-size: 17px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  input::placeholder {
    color: ${nocturne.muted3};
    font-weight: 500;
  }
`;

const Outcomes = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14.5px;
  line-height: 1.5;
  color: ${nocturne.cream};

  strong {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .soft {
    color: ${nocturne.muted2};
  }
`;

function splitLabel(label: string): { name: string; examples: string } {
  const at = label.indexOf(" (");
  if (at < 0) return { name: label, examples: "" };
  return { name: label.slice(0, at), examples: label.slice(at + 2).replace(/\)$/, "") };
}

type Props = {
  state: QuoteState;
  seats: number;
  /** the price as typed, digits only */
  price: string;
  /** the car type chosen in this draft; empty means the default */
  vehicleClass: string;
  onPrice: (price: string) => void;
  onVehicleClass: (code: string) => void;
  onChangeSeats: () => void;
  /** people riding with the driver who are not booking a seat */
  others: number;
  onOthers: (count: number) => void;
};

/**
 * The Price step of Publish a ride, shared by the desktop and phone layouts. It suggests an even split
 * of the trip cost, lets the driver pick within a range, and shows what they would receive.
 */
export function PriceStep({ state, seats, others, price, vehicleClass, onPrice, onVehicleClass, onOthers }: Props) {
  const fare = Number(price) || 0;
  // What is in the amount box while typing. Null means it shows the chosen price when that is not a quick pick.
  const [typed, setTyped] = useState<string | null>(null);

  const quote = state.status === "ready" ? state.quote : null;
  const classes = quote?.classes ?? (state.status === "loading" ? state.classes : undefined);
  const activeClass = quote?.vehicleClass ?? (state.status === "loading" ? state.vehicleClass : undefined) ?? vehicleClass;
  const range = quote ? rangeFor(quote, seats, others) : null;
  // The car holds eight in all, so the people riding along and the seats offered share that room.
  const maxOthers = Math.max(0, 8 - seats);

  const typedValue = (digits: string) => (digits ? Number(digits).toLocaleString("en-US") : "");
  // Set once a decimal point has been typed. Prices are whole shillings, so the point ends the amount and
  // anything typed after it is ignored until the driver deletes a digit or leaves the box.
  const pointed = useRef(false);
  const onType = (raw: string) => {
    const digits = wholeShillings(raw);
    if (raw.includes(".")) pointed.current = true;
    else if (pointed.current) {
      const current = typed ?? price;
      if (current.length > 0 && digits.length > current.length) return;
      pointed.current = false;
    }
    setTyped(digits);
    onPrice(digits);
  };
  const onBlur = () => {
    pointed.current = false;
  };

  if (state.status === "unavailable" || (state.status === "ready" && !range)) {
    return (
      <Wrap>
        <Section>
          <Note>We couldn’t work out a suggested price for this trip. Enter the price you’d like to charge for each seat.</Note>
          <AmountBox $on={fare > 0} $bad={false}>
            <span className="unit">KES</span>
            <input
              inputMode="numeric"
              placeholder="Price per seat"
              aria-label="Price per seat in Kenyan shillings"
              value={typedValue(typed ?? price)}
              onChange={(e) => onType(e.target.value)}
              onBlur={onBlur}
            />
          </AmountBox>
        </Section>
      </Wrap>
    );
  }

  const classChips = classes && classes.length > 0 && (
    <Section>
      <Label id="price-class-label">Car type</Label>
      <Chips role="group" aria-labelledby="price-class-label">
        {classes.map((c) => {
          const { name, examples } = splitLabel(c.label);
          return (
            <ClassChip key={c.code} type="button" $on={activeClass === c.code} aria-pressed={activeClass === c.code} onClick={() => onVehicleClass(c.code)}>
              <span className="name">{name}</span>
              {examples && <span className="examples">{examples}</span>}
            </ClassChip>
          );
        })}
      </Chips>
      <Note>Helps us estimate your fuel. You’ll pick the car you’re driving on the next step.</Note>
    </Section>
  );

  if (!quote || !range) {
    return (
      <Wrap aria-busy="true">
        {classChips}
        <Note role="status">Working out a fair price…</Note>
      </Wrap>
    );
  }

  // Changing who is in the car moves the recommended price. A driver who was on the recommended price stays on it.
  const changeOthers = (count: number) => {
    const next = rangeFor(quote, seats, count);
    if (next && fare === range.recommendedKes) {
      setTyped(null);
      onPrice(String(next.recommendedKes));
    }
    onOthers(count);
  };
  const othersControl = (
    <Section>
      <Label id="price-others-label">Anyone else travelling with you?</Label>
      <Counter role="group" aria-labelledby="price-others-label">
        <CountButton
          type="button"
          aria-label="One fewer person travelling with you"
          disabled={others <= 0}
          onClick={() => changeOthers(others - 1)}
        >
          −
        </CountButton>
        <span className="count" aria-live="polite">
          {others === 0 ? "Just me" : `${others} ${others === 1 ? "other" : "others"}`}
        </span>
        <CountButton
          type="button"
          aria-label="One more person travelling with you"
          disabled={others >= maxOthers}
          onClick={() => changeOthers(others + 1)}
        >
          +
        </CountButton>
      </Counter>
      <Note>People riding with you who aren’t booking a seat. They share the cost, so passengers don’t pay for them.</Note>
    </Section>
  );

  const verdict = fare > 0 ? judgePrice(fare, range) : "invalid";
  const inRange = verdict !== "invalid" && verdict !== "below_floor" && verdict !== "above_cap";
  // Only the recommended price is offered as a quick pick. The floor and the cap stay unannounced until the
  // driver goes near them, so a price that matches another choice is shown in the amount box.
  const quickPicks = range.choices.filter((c) => c.key === "recommended");
  const choiceHit = quickPicks.some((c) => c.kes === fare);
  const boxValue = typed !== null ? typedValue(typed) : fare > 0 && !choiceHit ? typedValue(String(fare)) : "";
  const outcomes = inRange ? fillOutcomes(fare, seats, range.tripCostKes, quote.config) : [];
  const full = outcomes[outcomes.length - 1];
  // One plain sentence about a full car. The fee is not mentioned here: it is shown to passengers.
  const fullCar = seats === 1 ? "If your seat is booked" : seats === 2 ? "If both seats are booked" : `If all ${seats} seats are booked`;
  const dashed = (kes: number) => formatKes(kes);

  // The range is shown only once the driver moves away from the recommended price. At the recommended price
  // there is nothing to explain.
  const showRange = verdict === "lower" || verdict === "higher" || verdict === "below_floor" || verdict === "above_cap";
  let rangeNote = `Between ${dashed(range.floorKes)} and ${dashed(range.capKes)} a seat.`;
  let tone: "danger" | undefined;
  if (verdict === "below_floor") {
    rangeNote = `That’s too low for this trip. The lowest is ${dashed(range.floorKes)} a seat.`;
    tone = "danger";
  } else if (verdict === "above_cap") {
    rangeNote = `That’s too high for a shared ride. The most is ${dashed(range.capKes)} a seat.`;
    tone = "danger";
  }

  const verdictNote =
    verdict === "recommended"
      ? others > 0
        ? "An even split of the trip cost across everyone in the car."
        : "An even split of the trip cost, with your own share included."
      : verdict === "higher"
        ? "Above the recommended price, so lower-priced rides may be booked first."
        : "";

  return (
    <Wrap>
      {classChips}

      {othersControl}

      <Card>
        <div className="kicker">Recommended</div>
        <div className="amount">
          {formatKes(range.recommendedKes)}
          <span className="unit">per seat</span>
        </div>
        <Why>
          <summary>How is this worked out?</summary>
          <p>
            Fuel and wear for about {Math.round(quote.distanceKm)} km, shared evenly between you
            {others > 0 ? `, ${others} ${others === 1 ? "other" : "others"} travelling with you` : ""} and {seats}{" "}
            {seats === 1 ? "passenger" : "passengers"}. Fuel at about {formatKes(quote.fuel.priceKes)} a litre.
          </p>
        </Why>
      </Card>

      <Section>
        <Label id="price-pick-label">Your price per seat</Label>
        <Chips role="group" aria-labelledby="price-pick-label">
          {quickPicks.map((c) => (
            <PickChip
              key={c.key}
              type="button"
              $on={fare === c.kes}
              aria-pressed={fare === c.kes}
              onClick={() => {
                setTyped(null);
                onPrice(String(c.kes));
              }}
            >
              <span className="tag">{CHOICE_LABEL[c.key]}</span>
              <span className="kes">{formatKes(c.kes)}</span>
            </PickChip>
          ))}
        </Chips>

        <AmountBox $on={fare > 0 && !choiceHit} $bad={tone === "danger"}>
          <span className="unit">KES</span>
          <input
            inputMode="numeric"
            placeholder="Or enter your own price"
            aria-label="Your own price per seat in Kenyan shillings"
            aria-invalid={tone === "danger"}
            aria-describedby={showRange ? "price-range-note" : undefined}
            value={boxValue}
            onChange={(e) => onType(e.target.value)}
            onBlur={onBlur}
          />
        </AmountBox>
        {showRange && (
          <Note id="price-range-note" $tone={tone} role={tone ? "alert" : undefined}>
            {rangeNote}
          </Note>
        )}
        {verdictNote && <Note>{verdictNote}</Note>}
      </Section>

      {full && (
        <Section>
          <Outcomes>
            <li>
              {fullCar}, you’d receive <strong>{formatKes(full.recoveredKes)}</strong>, covering about{" "}
              {full.shareOfCostPct}% of your trip cost.
            </li>
          </Outcomes>
        </Section>
      )}
    </Wrap>
  );
}
