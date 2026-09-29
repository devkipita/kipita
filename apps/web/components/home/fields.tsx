"use client";

import styled from "styled-components";
import { Minus, Plus } from "@/components/icons";

/**
 * Form atoms shared by the route planner, the post drawer, the KYC form and the
 * alert composer. They sit here rather than in `components/ui/primitives.ts`
 * because they are specific to these compact, drawer-shaped forms — the
 * primitives' `Field`/`Input` are tuned for full-page auth and admin forms.
 */

export const FieldBlock = styled.div`
  display: grid;
  gap: 9px;
`;

export const FieldHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  label,
  span.k {
    font-size: ${({ theme }) => theme.type.label};
    font-weight: 700;
    color: ${({ theme }) => theme.color.textSoft};
  }
  span.v {
    font-size: ${({ theme }) => theme.type.label};
    font-weight: 700;
    color: ${({ theme }) => theme.color.primary};
  }
`;

export const TextInput = styled.input`
  width: 100%;
  padding: 13px 15px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1.5px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  font-size: ${({ theme }) => theme.type.body};

  &::placeholder {
    color: ${({ theme }) => theme.color.textSoft};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.primary};
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 110px;
  resize: vertical;
  padding: 13px 15px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1.5px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  font-size: ${({ theme }) => theme.type.body};
  line-height: 1.5;

  &::placeholder {
    color: ${({ theme }) => theme.color.textSoft};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.primary};
  }
`;

export const FieldError = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 600;
  color: ${({ theme }) => theme.color.dangerText};
`;

/* ── Segmented control ── */

export const Segmented = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface2};
`;

export const SegmentButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  background: ${({ theme, $active }) =>
    $active ? theme.color.primaryContainer : "transparent"};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onPrimaryContainer : theme.color.muted};

  &:hover:not(:disabled) {
    color: ${({ theme, $active }) =>
      $active ? theme.color.onPrimaryContainer : theme.color.text};
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

/* ── Chip (presets, categories) ── */

export const Chip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 15px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  background: ${({ theme, $active }) =>
    $active ? theme.color.primaryContainer : theme.color.surface2};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onPrimaryContainer : theme.color.textSoft};

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.color.primaryContainer : theme.color.line};
  }
`;

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

/* ── Seat stepper ── */

const StepperShell = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface2};

  button {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: ${({ theme }) => theme.color.text};
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.surface};
  }
  button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  b {
    min-width: 34px;
    text-align: center;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 700;
  }
`;

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <StepperShell>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Fewer ${label}`}
      >
        <Minus size={16} />
      </button>
      <b aria-live="polite">{value}</b>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`More ${label}`}
      >
        <Plus size={16} />
      </button>
    </StepperShell>
  );
}

/* ── Suggestion list (towns) ── */

export const Suggestions = styled.ul`
  list-style: none;
  margin: 0;
  padding: 6px;
  display: grid;
  gap: 2px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface2};

  li button {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 10px 12px;
    border: none;
    border-radius: ${({ theme }) => theme.radius.sm};
    background: transparent;
    color: ${({ theme }) => theme.color.text};
    font: inherit;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  li button:hover {
    background: ${({ theme }) => theme.color.surface};
  }
  li small {
    color: ${({ theme }) => theme.color.textSoft};
    font-weight: 500;
  }
`;
