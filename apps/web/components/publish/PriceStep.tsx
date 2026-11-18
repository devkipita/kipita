"use client";

import { useState } from "react";
import styled, { css } from "styled-components";
import { fillOutcomes, judgePrice, type PriceChoiceKey } from "@kipita/shared";
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

const TextButton = styled.button`
  min-height: 44px;
  margin: -6px 0 -6px -4px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: ${nocturne.ink};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  align-self: flex-start;
  ${ring}
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
};

/**
 * The Price step of Publish a ride, shared by the desktop and phone layouts. It suggests an even split
 * of the trip cost, lets the driver pick within a range, and shows what they would receive.
 */
export function PriceStep({ state, seats, price, vehicleClass, onPrice, onVehicleClass, onChangeSeats }: Props) {
  const fare = Number(price) || 0;
  // What is in the amount box while typing. Null means it shows the chosen price when that is not a quick pick.
  const [typed, setTyped] = useState<string | null>(null);

  const quote = state.status === "ready" ? state.quote : null;
  const classes = quote?.classes ?? (state.status === "loading" ? state.classes : undefined);
  const activeClass = quote?.vehicleClass ?? (state.status === "loading" ? state.vehicleClass : undefined) ?? vehicleClass;
  const range = quote ? rangeFor(quote, seats) : null;

  const typedValue = (digits: string) => (digits ? Number(digits).toLocaleString("en-US") : "");
  const onType = (raw: string) => {
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 6);
    setTyped(digits);
    onPrice(digits);
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

  const verdict = fare > 0 ? judgePrice(fare, range) : "invalid";
  const inRange = verdict !== "invalid" && verdict !== "below_floor" && verdict !== "above_cap";
  const choiceHit = range.choices.some((c) => c.kes === fare);
  const boxValue = typed !== null ? typedValue(typed) : fare > 0 && !choiceHit ? typedValue(String(fare)) : "";
  const outcomes = inRange ? fillOutcomes(fare, seats, range.tripCostKes, quote.config) : [];
  const one = outcomes[0];
  const full = outcomes[outcomes.length - 1];
  const feePercent = quote.config.feeBps / 100;
  const fewer = seats > 1 ? rangeFor(quote, seats - 1) : null;
  const dashed = (kes: number) => formatKes(kes);

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
      ? "This is an even split of the trip cost, with your own share included."
      : verdict === "lower"
        ? "That’s under an even split. Passengers will like it, and you’ll cover less of the trip cost."
        : verdict === "higher"
          ? "That’s over an even split, so cheaper rides may fill first."
          : "";

  return (
    <Wrap>
      {classChips}

      <Card>
        <div className="kicker">Recommended</div>
        <div className="amount">
          {formatKes(range.recommendedKes)}
          <span className="unit">per seat</span>
        </div>
        <p>
          Fuel and wear for about {Math.round(quote.distanceKm)} km, shared evenly between you and {seats}{" "}
          {seats === 1 ? "passenger" : "passengers"}. Fuel at about {formatKes(quote.fuel.priceKes)} a litre.
        </p>
      </Card>

      <Section>
        <Label id="price-pick-label">Your price per seat</Label>
        <Chips role="group" aria-labelledby="price-pick-label">
          {range.choices.map((c) => (
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
            aria-describedby="price-range-note"
            value={boxValue}
            onChange={(e) => onType(e.target.value)}
          />
        </AmountBox>
        <Note id="price-range-note" $tone={tone} role={tone ? "alert" : undefined}>
          {rangeNote}
        </Note>
        {verdictNote && <Note>{verdictNote}</Note>}
      </Section>

      {one && full && (
        <Section>
          <Label>What you’d receive</Label>
          <Outcomes>
            <li>
              If 1 passenger books: <strong>{formatKes(one.recoveredKes)}</strong>{" "}
              <span className="soft">· about {one.shareOfCostPct}% of the trip cost</span>
            </li>
            {outcomes.length > 1 && (
              <li>
                If all {seats} seats fill: <strong>{formatKes(full.recoveredKes)}</strong>{" "}
                <span className="soft">· about {full.shareOfCostPct}% of the trip cost</span>
              </li>
            )}
            <li className="soft">
              {quote.config.feeMode === "on_top"
                ? `Passengers pay ${formatKes(one.passengerPaysKes)} a seat: your price plus Kipita’s ${feePercent}% service fee. You keep your full price.`
                : `Passengers pay ${formatKes(fare)} a seat. Kipita’s ${feePercent}% fee comes out of what you receive.`}
            </li>
          </Outcomes>
        </Section>
      )}

      {fewer && fewer.recommendedKes !== range.recommendedKes && (
        <Section>
          <Note>
            Offering {seats - 1} {seats - 1 === 1 ? "seat" : "seats"} instead? The recommended price would be{" "}
            {formatKes(fewer.recommendedKes)} each.
          </Note>
          <TextButton type="button" onClick={onChangeSeats}>
            Change seats
          </TextButton>
        </Section>
      )}
    </Wrap>
  );
}
