"use client";

import { useState } from "react";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { PanelBody, PanelFoot } from "./SidePanel";
import { Btn, Chip, Chips, Err, Label, Sub, Title } from "./CancelPanel";

const REASONS = [
  "I was at the pickup",
  "The driver left early",
  "The driver didn't wait",
  "I told the driver I couldn't come",
];

/** The passenger says a no-show report is wrong. Support reviews it while the fare stays on hold. */
export function NoShowPanel({
  busy,
  error,
  onBack,
  onSend,
}: {
  busy: boolean;
  error: string;
  onBack: () => void;
  onSend: (note: string) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);

  return (
    <>
      <PanelBody>
        <Title>What happened?</Title>
        <Sub>We keep your fare on hold while we look into it.</Sub>
        <Label>Pick the one that fits</Label>
        <Chips role="radiogroup" aria-label="What happened">
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
        <Btn type="button" onClick={onBack} disabled={busy}>
          Back
        </Btn>
        <Btn type="button" onClick={() => reason && onSend(reason)} disabled={busy || !reason} aria-busy={busy}>
          {busy && <ButtonOrb job="committing" />}
          Send for review
        </Btn>
      </PanelFoot>
    </>
  );
}
