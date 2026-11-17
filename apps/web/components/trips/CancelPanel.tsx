"use client";

import { useState } from "react";
import styled from "styled-components";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { PanelBody, PanelFoot } from "./SidePanel";
import { RefundBackArt, TurnBackArt } from "./CancelArt";

const REASONS = ["Plans changed", "Found another ride", "Driver asked me to", "Time doesn't work"];

const Art = styled.div`
  display: grid;
  place-items: center;
  margin: 0 0 8px;

  svg {
    max-width: 260px;
  }
`;

const Title = styled.h3`
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-align: center;
  color: ${nocturne.cream};
`;

const Sub = styled.p`
  margin: 6px 0 0;
  font-size: 15px;
  text-align: center;
  color: ${nocturne.muted};
  font-variant-numeric: tabular-nums;
`;

const Label = styled.p`
  margin: 22px 0 8px;
  font-size: 13px;
  font-weight: 800;
  color: ${nocturne.muted};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.button<{ $on: boolean }>`
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface2)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Err = styled.p`
  margin: 14px 0 0;
  font-weight: 700;
  text-align: center;
  color: ${nocturne.danger};
`;

const Btn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
  padding: 0 16px;
  border-radius: 999px;
  border: 2px solid ${({ $danger }) => ($danger ? "transparent" : nocturne.green)};
  background: ${({ $danger }) => ($danger ? nocturne.danger : nocturne.surface)};
  color: ${({ $danger }) => ($danger ? nocturne.onGreen : nocturne.green)};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

export function CancelPanel({
  money,
  refund,
  busy,
  error,
  onKeep,
  onCancel,
}: {
  money: string;
  refund: boolean;
  busy: boolean;
  error: string;
  onKeep: () => void;
  onCancel: (reason: string | undefined) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);

  return (
    <>
      <PanelBody>
        <Art>
          {refund ? <RefundBackArt /> : <TurnBackArt />}
        </Art>
        <Title>Cancel this ride?</Title>
        <Sub>{money}</Sub>
        <Label>Why are you cancelling?</Label>
        <Chips role="radiogroup" aria-label="Reason for cancelling">
          {REASONS.map((r) => (
            <Chip
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              $on={reason === r}
              onClick={() => setReason(reason === r ? null : r)}
            >
              {r}
            </Chip>
          ))}
        </Chips>
        {error && <Err role="alert">{error}</Err>}
      </PanelBody>
      <PanelFoot>
        <Btn type="button" onClick={onKeep} disabled={busy}>
          Keep ride
        </Btn>
        <Btn type="button" $danger onClick={() => onCancel(reason ?? undefined)} disabled={busy} aria-busy={busy}>
          {busy && <ButtonOrb job="committing" />}
          Cancel ride
        </Btn>
      </PanelFoot>
    </>
  );
}
