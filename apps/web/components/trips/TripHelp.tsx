"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { Check, QuestionCircle } from "@/components/icons";
import { useSupport } from "@/components/support/SupportProvider";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { HELP_TOPICS } from "@/lib/trips/copy";
import { nocturne } from "@/lib/nocturne";
import { openSupportCaseAction } from "@/lib/support/actions";
import type { Booking } from "@/lib/trips/types";
import { ButtonOrb } from "@/components/ui/ButtonOrb";

const Card = styled.section`
  display: grid;
  gap: 14px;

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(21px, 2.2vw, 26px);
    font-weight: 800;
    letter-spacing: -0.028em;
    color: ${nocturne.cream};
  }
  > p {
    margin: 0;
    font-size: 16px;
    line-height: 1.55;
    max-width: 62ch;
    color: ${nocturne.muted};
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
  gap: 9px;
  padding: 5px 10px;
  border: 1.5px solid
    ${({ $active }) =>
      $active
        ? nocturne.accent
        : "color-mix(in oklab, var(--n-accent) 58%, transparent)"};
  border-radius: 8px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.01em;
  cursor: pointer;
  background: ${({ $active }) => ($active ? nocturne.accent : "transparent")};
  color: ${({ $active }) => ($active ? nocturne.onGreen : nocturne.cream)};
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;

  svg {
    flex: none;
    color: ${({ $active }) => ($active ? nocturne.lime : nocturne.accent)};
    transition: color 0.16s ease;
  }
  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.accent};
      background: ${({ $active }) =>
        $active ? nocturne.greenDeep : nocturne.surface2};
      color: ${({ $active }) => ($active ? nocturne.lime : nocturne.accent)};
    }
    &:hover svg {
      color: ${({ $active }) => ($active ? nocturne.lime : nocturne.accent)};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Form = styled.div`
  display: grid;
  gap: 10px;

  textarea {
    width: 100%;
    min-height: 104px;
    border: 1.5px solid
      color-mix(in oklab, var(--n-accent) 58%, transparent);
    border-radius: 12px;
    padding: 13px 15px;
    background: ${nocturne.surface};
    color: ${nocturne.cream};
    caret-color: ${nocturne.accent};
    font: inherit;
    font-size: 16px;
    line-height: 1.55;
    resize: vertical;
    transition: border-color 0.16s ease;
  }
  textarea::placeholder {
    color: ${nocturne.muted2};
  }
  textarea:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: inset 0 0 0 1px ${nocturne.accent};
  }

  .acts {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
`;

const Done = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 62ch;
  padding: 16px 18px;
  border-radius: 14px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;

  svg {
    flex: none;
    margin-top: 2px;
    color: ${nocturne.lime};
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
          <Check size={21} />
          {existing.subject}. Open with support. The Support button follows you
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
              <Icon size={23} />
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
              aria-busy={pending}
            >
              <QuestionCircle size={16} />
              {pending ? <><ButtonOrb job="committing" /> Opening…</> : "Open case"}
            </ButtonEl>
          </div>
        </Form>
      )}
    </Card>
  );
}
