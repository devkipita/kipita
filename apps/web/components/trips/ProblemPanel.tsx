"use client";

import { useState } from "react";
import styled from "styled-components";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { nocturne } from "@/lib/nocturne";
import { PROBLEM_KINDS, type ProblemKind } from "@/lib/trips/problems";
import { PanelBody, PanelFoot } from "./SidePanel";
import { Btn, Chip, Chips, Err, Label, Sub, Title } from "./CancelPanel";

const Note = styled.textarea`
  display: block;
  width: 100%;
  min-height: 112px;
  padding: 14px 16px;
  border: 2px solid ${nocturne.surface2};
  border-radius: 16px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 16px;
  line-height: 1.45;
  resize: vertical;

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

/**
 * The passenger tells us something went wrong with a ride that has started. Their driver's payment is
 * paused while we look into it (database: report_problem). The note is required so the reviewer has
 * something to act on.
 */
export function ProblemPanel({
  busy,
  error,
  onBack,
  onSend,
  held = true,
}: {
  busy: boolean;
  error: string;
  held?: boolean;
  onBack: () => void;
  onSend: (kind: ProblemKind, note: string) => void;
}) {
  const [kind, setKind] = useState<ProblemKind | null>(null);
  const [note, setNote] = useState("");
  const ready = kind !== null && note.trim().length >= 5;

  return (
    <>
      <PanelBody>
        <Title>What went wrong?</Title>
        <Sub>{held ? "We hold the fare while we look into it." : "We look into every report and tell you what we decide."}</Sub>
        <Label>What happened?</Label>
        <Chips role="radiogroup" aria-label="What went wrong">
          {PROBLEM_KINDS.map((k) => (
            <Chip
              key={k.value}
              type="button"
              role="radio"
              aria-checked={kind === k.value}
              $on={kind === k.value}
              onClick={() => setKind(kind === k.value ? null : k.value)}
            >
              {k.label}
            </Chip>
          ))}
        </Chips>
        <Label as="label" htmlFor="problem-note">
          Details
        </Label>
        <Note
          id="problem-note"
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A sentence or two"
        />
        {error && <Err role="alert">{error}</Err>}
      </PanelBody>
      <PanelFoot>
        <Btn type="button" onClick={onBack} disabled={busy}>
          Back
        </Btn>
        <Btn type="button" onClick={() => kind && onSend(kind, note)} disabled={busy || !ready} aria-busy={busy}>
          {busy && <ButtonOrb job="committing" />}
          Send report
        </Btn>
      </PanelFoot>
    </>
  );
}
