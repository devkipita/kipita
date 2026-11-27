"use client";

import styled from "styled-components";
import { CLEARED_THRESHOLD, alertStatus, clearedVotesLeft } from "@kipita/shared";
import type { AlertVotes } from "@kipita/shared";
import { CheckCircle } from "@/components/icons";
import { RollingNumber } from "@/components/ui/Counter";
import { nocturne } from "@/lib/nocturne";

const Badge = styled.span<{ $solid: boolean; $spaced: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  width: fit-content;
  min-height: 24px;
  margin: ${({ $spaced }) => ($spaced ? "0 0 8px" : "0")};
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ theme, $solid }) => ($solid ? nocturne.surface : theme.color.successContainer)};
  --icon-knockout: ${({ theme, $solid }) => ($solid ? nocturne.surface : theme.color.successContainer)};
  color: ${({ theme }) => theme.color.onSuccessContainer};
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;

  svg {
    flex: none;
  }
`;

export function ClearedTag({ solid = false, spaced = false }: { solid?: boolean; spaced?: boolean }) {
  return (
    <Badge $solid={solid} $spaced={spaced} title={`${CLEARED_THRESHOLD} people say this is cleared`}>
      <CheckCircle size={16} weight="fill" aria-hidden />
      Cleared
    </Badge>
  );
}

const Note = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  color: ${nocturne.muted};

  &:empty {
    display: none;
  }
  b {
    color: ${nocturne.cream};
  }
`;

export function ClearedNote({ votes }: { votes: AlertVotes }) {
  let text: React.ReactNode = null;

  if (alertStatus(votes) === "cleared") {
    text = (
      <>
        <b>Cleared.</b> {CLEARED_THRESHOLD} people say it&rsquo;s cleared.
      </>
    );
  } else if (votes.cleared_count > 0) {
    text = (
      <>
        <RollingNumber value={votes.cleared_count} /> of {CLEARED_THRESHOLD} say it&rsquo;s clear. {clearedVotesLeft(votes)} more and it is
        marked Cleared.
      </>
    );
  }

  return (
    <Note role="status" aria-live="polite">
      {text}
    </Note>
  );
}
