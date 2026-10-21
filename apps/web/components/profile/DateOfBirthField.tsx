"use client";

import { useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";
import { CaretDown, Check } from "@/components/icons";
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

const CONTROL_HEIGHT = "48px";

const Grid = styled.div`
  display: grid;
  grid-template-columns: 0.7fr 1.5fr 0.9fr;
  align-items: start;
  gap: 16px;

  @media (max-width: 420px) {
    gap: 10px;
  }
`;

const Part = styled.div`
  display: block;
  min-width: 0;

  > label {
    display: block;
    height: 18px;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: ${nocturne.muted2};
    cursor: pointer;
  }

  input {
    height: ${CONTROL_HEIGHT};
    padding-block: 0;
    box-sizing: border-box;
  }
`;

const Anchor = styled.div`
  position: relative;
`;

const Trigger = styled.button<{ $empty: boolean; $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: ${CONTROL_HEIGHT};
  padding: 0;
  box-sizing: border-box;
  border: none;
  border-radius: 0;
  border-bottom: ${({ $open }) => ($open ? "3px" : "2px")} solid
    ${({ $open }) => ($open ? nocturne.accent : RULE)};
  background: ${({ $open }) => ($open ? nocturne.surface2 : "transparent")};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 23px;
  font-weight: ${({ $empty }) => ($empty ? 500 : 700)};
  letter-spacing: -0.02em;
  text-align: left;
  color: ${({ $empty }) => ($empty ? nocturne.muted2 : nocturne.cream)};
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    border-width 0.12s ease,
    background-color 0.16s ease,
    color 0.16s ease;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    flex: none;
    color: ${({ $open }) => ($open ? nocturne.accent : nocturne.muted)};
    transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
    transition:
      transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
      color 0.16s ease;
  }

  @media (hover: hover) {
    &:hover {
      border-bottom-color: ${nocturne.accent};
    }
    &:hover svg {
      color: ${nocturne.accent};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const Menu = styled.ul`
  position: absolute;
  z-index: 40;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 268px;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
  border-radius: 14px;
  background: ${nocturne.surface};
  box-shadow:
    0 2px 6px -2px rgba(0, 0, 0, 0.18),
    0 18px 38px -16px rgba(0, 0, 0, 0.3);
  animation: menu-in 0.16s cubic-bezier(0.22, 1, 0.36, 1) both;

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  scrollbar-width: thin;
  scrollbar-color: ${nocturne.accent} transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in oklab, var(--n-accent) 45%, transparent);
  }
`;

const Item = styled.li<{ $active: boolean; $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 9px;
  font-size: 16px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  color: ${({ $selected }) => ($selected ? nocturne.accent : nocturne.cream)};
  background: ${({ $active }) => ($active ? nocturne.surface2 : "transparent")};
  cursor: pointer;

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Hint = styled.p<{ $error?: boolean }>`
  margin: 14px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme, $error }) =>
    $error ? theme.color.dangerText : nocturne.muted};
`;

function daysInMonth(month: number, year: number): number {
  if (!month) return 31;
  if (!year) return month === 2 ? 29 : [4, 6, 9, 11].includes(month) ? 30 : 31;
  return new Date(year, month, 0).getDate();
}

function compose(day: string, month: string, year: string): string {
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
  const initial = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const [day, setDay] = useState(initial ? String(Number(initial[3])) : "");
  const [month, setMonth] = useState(initial ? String(Number(initial[2])) : "");
  const [year, setYear] = useState(initial ? initial[1] : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  function commit(nextDay: string, nextMonth: string, nextYear: string) {
    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);
    onChange(compose(nextDay, nextMonth, nextYear));
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!anchorRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function choose(index: number) {
    commit(day, String(index + 1), year);
    setOpen(false);
    triggerRef.current?.focus();
    if (!year) yearRef.current?.focus();
  }

  function onTriggerKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        setActive(month ? Number(month) - 1 : 0);
        setOpen(true);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % MONTHS.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + MONTHS.length) % MONTHS.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActive(MONTHS.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
      return;
    }
    if (/^[a-z]$/i.test(event.key)) {
      const found = MONTHS.findIndex((m) =>
        m.toLowerCase().startsWith(event.key.toLowerCase()),
      );
      if (found >= 0) setActive(found);
    }
  }

  const age = ageFrom(value);
  const filled = day && month && year.length === 4;
  const invalid = Boolean(filled && !value);
  const tooYoung = age !== null && age < 16;
  const monthLabel = month ? MONTHS[Number(month) - 1] : "Choose";

  return (
    <>
      <Grid>
        <Part>
          <label htmlFor={`${id}-day`}>Day</label>
          <BareInput
            id={`${id}-day`}
            inputMode="numeric"
            autoComplete="bday-day"
            placeholder="14"
            maxLength={2}
            value={day}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 2);
              commit(next, month, year);
              if (next.length === 2 && !month) {
                setActive(0);
                setOpen(true);
                triggerRef.current?.focus();
              }
            }}
          />
        </Part>

        <Part>
          <label id={`${id}-month-label`} htmlFor={`${id}-month`}>
            Month
          </label>
          <Anchor ref={anchorRef}>
            <Trigger
              id={`${id}-month`}
              ref={triggerRef}
              type="button"
              $empty={!month}
              $open={open}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-labelledby={`${id}-month-label ${id}-month`}
              aria-activedescendant={open ? `${id}-month-${active}` : undefined}
              onClick={() => {
                setActive(month ? Number(month) - 1 : 0);
                setOpen((v) => !v);
              }}
              onKeyDown={onTriggerKeyDown}
            >
              <span>{monthLabel}</span>
              <CaretDown size={20} />
            </Trigger>

            {open && (
              <Menu ref={menuRef} role="listbox" aria-labelledby={`${id}-month-label`}>
                {MONTHS.map((name, index) => (
                  <Item
                    key={name}
                    id={`${id}-month-${index}`}
                    role="option"
                    aria-selected={String(index + 1) === month}
                    data-active={index === active}
                    $active={index === active}
                    $selected={String(index + 1) === month}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(index)}
                  >
                    {name}
                    {String(index + 1) === month && <Check size={17} />}
                  </Item>
                ))}
              </Menu>
            )}
          </Anchor>
        </Part>

        <Part>
          <label htmlFor={`${id}-year`}>Year</label>
          <BareInput
            id={`${id}-year`}
            ref={yearRef}
            inputMode="numeric"
            autoComplete="bday-year"
            placeholder="1998"
            maxLength={4}
            value={year}
            onChange={(e) =>
              commit(day, month, e.target.value.replace(/\D/g, "").slice(0, 4))
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
