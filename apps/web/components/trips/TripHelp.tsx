"use client";

import { useState, useTransition } from "react";
import styled, { keyframes } from "styled-components";
import { CheckCircle, QuestionCircle } from "@/components/icons";
import { useSupport } from "@/components/support/SupportProvider";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { Chip } from "@/components/ui/Chip";
import { HELP_TOPICS, type HelpViewer } from "@/lib/trips/copy";
import { dur, ease, nocturne } from "@/lib/nocturne";
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

const unfold = keyframes`
  from { opacity: 0; transform: translateY(-10px) scaleY(0.92); }
  to { opacity: 1; transform: none; }
`;

const Form = styled.div`
  display: grid;
  gap: 10px;
  transform-origin: top center;
  animation: ${unfold} ${dur.enter} ${ease.enter};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

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
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.color.successContainer};
  --icon-knockout: ${({ theme }) => theme.color.successContainer};
  color: ${({ theme }) => theme.color.onSuccessContainer};
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;

  svg {
    flex: none;
    margin-top: 2px;
  }
`;

export function TripHelp({ booking, viewer }: { booking: Booking; viewer: HelpViewer }) {
  const { openCase, open } = useSupport();
  const [topic, setTopic] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const existing = open.find((c) => c.booking_id === booking.id) ?? null;
  const topics = HELP_TOPICS.filter((t) => t.viewers.includes(viewer));
  const chosen = topics.find((t) => t.key === topic) ?? null;

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
        <h2>Report a problem</h2>
        <Done role="status">
          <CheckCircle size={20} weight="fill" aria-hidden />
          {existing.subject}: with support now
        </Done>
      </Card>
    );
  }

  return (
    <Card>
      <h2>Report a problem</h2>

      <Chips role="group" aria-label="What went wrong?">
        {topics.map((t) => {
          const Icon = t.icon;
          const selected = topic === t.key;
          return (
            <Chip
              key={t.key}
              type="button"
              $tone={t.tone}
              $selected={selected}
              aria-pressed={selected}
              onClick={() => setTopic(selected ? null : t.key)}
            >
              <Icon size={18} weight={selected ? "fill" : "regular"} aria-hidden />
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
            placeholder="What happened?"
            aria-label="What happened?"
          />
          <div className="acts">
            <ButtonEl
              type="button"
              $compact
              $variant="ghost"
              onClick={() => setTopic(null)}
            >
              Discard report
            </ButtonEl>
            <ButtonEl
              type="button"
              $compact
              onClick={submit}
              disabled={pending || detail.trim().length < 10}
              aria-busy={pending}
            >
              <QuestionCircle size={16} />
              {pending ? <><ButtonOrb job="committing" /> Sending report…</> : "Send report"}
            </ButtonEl>
          </div>
        </Form>
      )}
    </Card>
  );
}
