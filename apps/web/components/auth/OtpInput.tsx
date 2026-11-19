"use client";

import { useRef } from "react";
import styled from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
`;

const Cell = styled.input`
  height: 60px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${nocturne.cream};
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1.5px solid ${nocturne.outline};
  background: ${nocturne.surface};
  transition:
    border-color ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard};

  &:focus {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

type Props = {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
};

export function OtpInput({ value, onChange, onComplete }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  function setAt(i: number, d: string) {
    const arr = value.padEnd(6, " ").slice(0, 6).split("");
    arr[i] = d;
    const next = arr.join("").replace(/\s/g, "");
    onChange(next);
    if (next.length === 6) onComplete?.(next);
  }

  return (
    <Row>
      {digits.map((d, i) => (
        <Cell
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of 6`}
          maxLength={i === 0 ? 6 : 1}
          value={d.trim()}
          onChange={(e) => {
            const only = e.target.value.replace(/\D/g, "");
            if (!only) return setAt(i, "");
            if (only.length > 1) {
              const pasted = only.slice(0, 6);
              onChange(pasted);
              if (pasted.length === 6) onComplete?.(pasted);
              refs.current[Math.min(pasted.length, 5)]?.focus();
              return;
            }
            setAt(i, only);
            refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i].trim() && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
        />
      ))}
    </Row>
  );
}
