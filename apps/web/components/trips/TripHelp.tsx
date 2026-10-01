"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { Check, QuestionCircle } from "@/components/icons";
import { useSupport } from "@/components/support/SupportProvider";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { HELP_TOPICS } from "@/lib/trips/copy";
import { openSupportCaseAction } from "@/lib/support/actions";
import type { Booking } from "@/lib/trips/types";

const Card = styled.section`
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  h2 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  > p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.55;
    max-width: 62ch;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.color.secondaryContainer : theme.color.surfaceContainerHigh};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onSecondaryContainer : theme.color.onSurfaceVariant};

  svg {
    flex: none;
  }
`;

const Form = styled.div`
  display: grid;
  gap: 10px;

  textarea {
    width: 100%;
    min-height: 96px;
    border: none;
    border-radius: ${({ theme }) => theme.radius.xs};
    padding: 11px 13px;
    background: ${({ theme }) => theme.color.surfaceContainerLowest};
    color: ${({ theme }) => theme.color.onSurface};
    font: inherit;
    font-size: 0.93rem;
    line-height: 1.5;
    resize: vertical;
  }

  .acts {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
`;

const Done = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.onSuccessContainer};
  background: ${({ theme }) => theme.color.successContainer};
  border-radius: ${({ theme }) => theme.radius.xs};
  padding: 12px 14px;

  svg {
    flex: none;
  }
`;

export function TripHelp({ booking }: { booking: Booking }) {
  const { openCase, open } = useSupport();
  const [topic, setTopic] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const existing = open.find((c) => c.booking_id === booking.id) ?? null;
  const chosen = HELP_TOPICS.find((t) => t.key === topic) ?? null;

  function submit() {
    if (!chosen || pending) return;
    setError("");

    startTransition(async () => {
      const result = await openCase({
        subject: chosen.subject,
        detail,
        category: chosen.category,
        bookingId: booking.id,
      });

      if (!result.ok) {
        setError(result.error ?? "We couldn't open that case.");
        return;
      }

      setTopic(null);
      setDetail("");
    });
  }

  if (existing) {
    return (
      <Card>
        <h2>Help with this trip</h2>
        <Done>
          <Check size={18} />
          {existing.subject} — open with support. The Support button follows you
          around the app until it is resolved.
        </Done>
      </Card>
    );
  }

  return (
    <Card>
      <h2>Help with this trip</h2>
      <p>
        Something go wrong? Tell us what happened and we will look into it. While
        a case is open on a trip, nothing is released to the driver.
      </p>

      <Chips role="group" aria-label="What went wrong?">
        {HELP_TOPICS.map((t) => {
          const Icon = t.icon;
          return (
            <Chip
              key={t.key}
              type="button"
              $active={topic === t.key}
              aria-pressed={topic === t.key}
              onClick={() => setTopic(topic === t.key ? null : t.key)}
            >
              <Icon size={16} />
              {t.subject}
            </Chip>
          );
        })}
      </Chips>

      {chosen && (
        <Form>
          {error && <Notice $variant="error">{error}</Notice>}
          <textarea
            value={detail}
            maxLength={2000}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="What happened? Times, names and what you expected all help."
            aria-label="What happened?"
          />
          <div className="acts">
            <ButtonEl
              type="button"
              $compact
              $variant="ghost"
              onClick={() => setTopic(null)}
            >
              Cancel
            </ButtonEl>
            <ButtonEl
              type="button"
              $compact
              onClick={submit}
              disabled={pending || detail.trim().length < 10}
            >
              <QuestionCircle size={16} />
              {pending ? "Opening…" : "Open case"}
            </ButtonEl>
          </div>
        </Form>
      )}
    </Card>
  );
}
