"use client";

import { useId, useMemo, useRef } from "react";
import styled from "styled-components";
import { CaretDown } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { BareInput, RULE } from "@/components/publish/controls";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CONTROL_HEIGHT = "46px";

const Grid = styled.div`
  display: grid;
  grid-template-columns: 0.72fr 1.6fr 1fr;
  align-items: start;
  gap: 14px;

  @media (max-width: 420px) {
    gap: 10px;
  }
`;

const Part = styled.label`
  display: block;
  min-width: 0;

  > span:first-child {
    display: block;
    height: 18px;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    line-height: 18px;
    letter-spacing: 0.01em;
    color: ${nocturne.muted2};
  }

  input {
    height: ${CONTROL_HEIGHT};
    padding-block: 0;
    box-sizing: border-box;
  }
`;

const SelectShell = styled.span`
  position: relative;
  display: block;

  svg {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: ${nocturne.muted};
    transition: color 0.16s ease;
  }
`;

const BareSelect = styled.select`
  width: 100%;
  height: ${CONTROL_HEIGHT};
  padding: 0 26px 0 0;
  box-sizing: border-box;
  border: none;
  border-bottom: 2px solid ${RULE};
  border-radius: 0;
  background: transparent;
  appearance: none;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 23px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${nocturne.cream};
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    border-width 0.12s ease,
    background-color 0.16s ease;

  &:invalid {
    color: ${nocturne.muted2};
    font-weight: 500;
  }

  option {
    color: ${nocturne.cream};
    background: ${nocturne.surface};
    font-size: 16px;
  }

  @media (hover: hover) {
    &:hover {
      border-bottom-color: ${nocturne.accent};
    }
  }
  &:focus,
  &:focus-visible {
    outline: none;
    border-bottom-width: 3px;
    border-bottom-color: ${nocturne.accent};
    background: ${nocturne.surface2};
  }
  &:focus + svg {
    color: ${nocturne.accent};
  }
`;

const Hint = styled.p<{ $error?: boolean }>`
  margin: 12px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme, $error }) =>
    $error ? theme.color.dangerText : nocturne.muted};
`;

type Parts = { day: string; month: string; year: string };

function split(iso: string): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return { day: "", month: "", year: "" };
  return { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) };
}

function daysInMonth(month: number, year: number): number {
  if (!month) return 31;
  if (!year) return month === 2 ? 29 : [4, 6, 9, 11].includes(month) ? 30 : 31;
  return new Date(year, month, 0).getDate();
}

function compose({ day, month, year }: Parts): string {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!d || !m || year.length !== 4) return "";
  if (y < 1900 || y > new Date().getFullYear()) return "";
  if (d > daysInMonth(m, y)) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function ageFrom(iso: string): number | null {
  if (!iso) return null;
  const born = new Date(iso);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function DateOfBirthField({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const id = useId();
  const monthRef = useRef<HTMLSelectElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const parts = useMemo(() => split(value), [value]);
  const draft = useRef<Parts>(parts);
  draft.current = value ? parts : draft.current;

  function update(next: Partial<Parts>) {
    const merged = { ...draft.current, ...next };
    draft.current = merged;
    onChange(compose(merged));
  }

  const current = draft.current;
  const age = ageFrom(value);
  const filled = current.day && current.month && current.year.length === 4;
  const invalid = Boolean(filled && !value);
  const tooYoung = age !== null && age < 16;

  return (
    <>
      <Grid>
        <Part htmlFor={`${id}-day`}>
          <span>Day</span>
          <BareInput
            id={`${id}-day`}
            inputMode="numeric"
            autoComplete="bday-day"
            placeholder="14"
            maxLength={2}
            value={current.day}
            onChange={(e) => {
              const day = e.target.value.replace(/\D/g, "").slice(0, 2);
              update({ day });
              if (day.length === 2) monthRef.current?.focus();
            }}
          />
        </Part>

        <Part htmlFor={`${id}-month`}>
          <span>Month</span>
          <SelectShell>
            <BareSelect
              id={`${id}-month`}
              ref={monthRef}
              required
              autoComplete="bday-month"
              value={current.month}
              onChange={(e) => {
                update({ month: e.target.value });
                if (e.target.value) yearRef.current?.focus();
              }}
            >
              <option value="" disabled>
                Choose
              </option>
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </BareSelect>
            <CaretDown size={18} />
          </SelectShell>
        </Part>

        <Part htmlFor={`${id}-year`}>
          <span>Year</span>
          <BareInput
            id={`${id}-year`}
            ref={yearRef}
            inputMode="numeric"
            autoComplete="bday-year"
            placeholder="1998"
            maxLength={4}
            value={current.year}
            onChange={(e) =>
              update({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })
            }
          />
        </Part>
      </Grid>

      {invalid ? (
        <Hint $error role="alert">
          That date doesn&apos;t exist. Check the day and year.
        </Hint>
      ) : tooYoung ? (
        <Hint $error role="alert">
          You need to be at least 16 to use Kipita.
        </Hint>
      ) : age !== null ? (
        <Hint>{age} years old. Only your age is shown to other members.</Hint>
      ) : (
        <Hint>Used to confirm you&apos;re 16 or older.</Hint>
      )}
    </>
  );
}
