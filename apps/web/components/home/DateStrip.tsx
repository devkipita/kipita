"use client";

import { useMemo, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { CheckSmall } from "@/components/icons";
import { dayLabel, nairobiToday } from "@/lib/trips/format";

const DAYS = 14;

const unfurl = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: none; }
`;

const Strip = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin-top: -18px;
  padding: 4px 2px 8px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;

  animation: ${unfurl} ${({ theme }) => theme.motion.duration.medium4}
    ${({ theme }) => theme.motion.easing.emphasizedDecelerate};

  &::-webkit-scrollbar {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Pill = styled.button<{ $on: boolean; $index: number }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  height: 34px;
  padding: 0 ${({ theme }) => theme.space.md};
  border: none;
  border-radius: ${({ theme, $on }) =>
    $on ? theme.radius.sm : theme.radius.xxs};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: ${({ $on }) => ($on ? 700 : 500)};
  white-space: nowrap;
  cursor: pointer;

  background: ${({ theme, $on }) =>
    $on ? theme.color.secondaryContainer : theme.color.elevatedInset};
  color: ${({ theme, $on }) =>
    $on ? theme.color.onSecondaryContainer : theme.color.onSurfaceVariant};

  animation: ${unfurl} ${({ theme }) => theme.motion.duration.medium2}
    ${({ theme }) => theme.motion.easing.emphasizedDecelerate} backwards;
  animation-delay: ${({ $index }) => Math.min($index, 9) * 22}ms;

  transition:
    background ${({ theme }) => theme.motion.duration.short4}
      ${({ theme }) => theme.motion.easing.standard},
    color ${({ theme }) => theme.motion.duration.short4}
      ${({ theme }) => theme.motion.easing.standard},
    border-radius ${({ theme }) => theme.motion.duration.medium2}
      ${({ theme }) => theme.motion.easing.emphasized},
    transform ${({ theme }) => theme.motion.duration.short3}
      ${({ theme }) => theme.motion.easing.standard};

  svg {
    flex: none;
  }

  @media (hover: hover) {
    &:hover {
      background: ${({ theme, $on }) =>
        $on ? theme.color.secondaryContainer : theme.color.surfaceVariant};
      color: ${({ theme }) => theme.color.onSurface};
    }
  }
  &:active {
    transform: scale(0.93);
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
    &:active {
      transform: none;
    }
  }
`;

type Day = { value: string | null; label: string };

function buildDays(): Day[] {
  const days: Day[] = [{ value: null, label: "Any date" }];
  for (let i = 0; i < DAYS; i += 1) {
    const iso = nairobiToday(i);
    days.push({ value: iso, label: dayLabel(iso) });
  }
  return days;
}

export function DateStrip({
  value,
  onChange,
  onDismiss,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
  onDismiss: () => void;
}) {
  const days = useMemo(buildDays, []);
  const ref = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onDismiss();
      return;
    }
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

    const pills = Array.from(
      ref.current?.querySelectorAll("button") ?? [],
    ) as HTMLButtonElement[];
    const index = pills.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;

    event.preventDefault();
    const next = event.key === "ArrowRight" ? index + 1 : index - 1;
    pills[Math.min(Math.max(next, 0), pills.length - 1)]?.focus();
  }

  return (
    <Strip
      ref={ref}
      role="group"
      aria-label="Filter rides by date"
      onKeyDown={onKeyDown}
    >
      {days.map((day, i) => {
        const on = day.value === value;
        return (
          <Pill
            key={day.value ?? "any"}
            type="button"
            $on={on}
            $index={i}
            aria-pressed={on}
            onClick={() => onChange(day.value)}
          >
            {on && <CheckSmall size={13} weight="bold" />}
            {day.label}
          </Pill>
        );
      })}
    </Strip>
  );
}
