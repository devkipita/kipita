"use client";

import styled from "styled-components";
import { CLEARED_THRESHOLD, alertStatus, clearedVotesLeft } from "@kipita/shared";
import type { AlertVotes } from "@kipita/shared";
import { CheckSmall as Check } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";

const Pill = styled.span<{ $solid: boolean; $spaced: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  width: fit-content;
  margin: ${({ $spaced }) => ($spaced ? "0 0 10px" : "0")};
  padding: 2px 9px 2px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, ${nocturne.accent} 45%, transparent);
  /* On a photo the pill needs a solid ground; elsewhere a tint of the accent is enough. */
  background: ${({ $solid }) =>
    $solid ? nocturne.surface : `color-mix(in srgb, ${nocturne.accent} 12%, transparent)`};
  color: ${nocturne.accent};
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1.5;
  white-space: nowrap;

  svg {
    flex: none;
  }
`;

/** The "Cleared" label: three people have said the road is back to normal. */
export function ClearedTag({
  solid = false,
  spaced = false,
}: {
  /** True when it sits on a photo. */
  solid?: boolean;
  /** True when it sits on its own line above the alert text. */
  spaced?: boolean;
}) {
  return (
    <Pill $solid={solid} $spaced={spaced} title={`${CLEARED_THRESHOLD} people say this is cleared`}>
      <Check size={13} weight="bold" />
      Cleared
    </Pill>
  );
}

const Note = styled.p`
  margin: 0 0 10px;
  font-size: 0.86rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSoft};

  &:empty {
    margin: 0;
  }
  b {
    color: ${({ theme }) => theme.color.text};
  }
`;

/**
 * What the votes so far mean for this alert, in words. It is a live region, so a screen reader
 * hears the change when the viewer taps Cleared.
 */
export function ClearedNote({ votes }: { votes: AlertVotes }) {
  let text: React.ReactNode = null;

  if (alertStatus(votes) === "cleared") {
    text = (
      <>
        <b>Cleared.</b> {CLEARED_THRESHOLD} people say it’s back to normal. If the problem comes
        back, post a new alert.
      </>
    );
  } else if (votes.cleared_count > 0) {
    text = (
      <>
        {votes.cleared_count} of {CLEARED_THRESHOLD} say it’s clear. {clearedVotesLeft(votes)} more
        and it is marked Cleared.
      </>
    );
  }

  return (
    <Note role="status" aria-live="polite">
      {text}
    </Note>
  );
}
