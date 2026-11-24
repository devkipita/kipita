"use client";

import { useState, useTransition } from "react";
import styled, { keyframes } from "styled-components";
import { CaretDown, CheckCircle, Lifebuoy, QuestionCircle } from "@/components/icons";
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
  gap: 16px;

  @media (min-width: 900px) {
    .toggle {
      display: none;
    }
  }
  @media (max-width: 899px) {
    .desk-title {
      display: none;
    }
    &:not([data-open="true"]) .options {
      display: none;
    }
  }

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
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

const HelpRow = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 12px 16px;
  border: 0;
  border-radius: 16px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  > svg:first-child {
    flex: none;
    color: ${nocturne.accent};
  }
  > span {
    flex: 1;
    min-width: 0;
  }
  > svg:last-child {
    flex: none;
    color: ${nocturne.muted};
    transition: rotate ${dur.state} ${ease.standard};
  }
  &[aria-expanded="true"] > svg:last-child {
    rotate: 180deg;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.cream} 4%, transparent);
    }
  }
  &:active {
    transform: scale(0.98);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const unfold = keyframes`
  from { opacity: 0; transform: translateY(-10px) scaleY(0.92); }
  to { opacity: 1; transform: none; }
`;

const Form = styled.div`
  display: grid;
  gap: 12px;
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
    padding: 12px 16px;
    background: ${nocturne.surface};
    color: ${nocturne.cream};
    caret-color: ${nocturne.accent};
    font: inherit;
    font-size: 16px;
    line-height: 1.55;
    resize: vertical;
    transition: border-color ${dur.state} ${ease.standard};
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
  const [opened, setOpened] = useState(false);

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
    <Card data-open={opened}>
      <h2 className="desk-title">Something wrong?</h2>
      <HelpRow
        className="toggle"
        type="button"
        aria-expanded={opened}
        aria-controls={`help-${booking.id}`}
        onClick={() => setOpened((o) => !o)}
      >
        <Lifebuoy size={24} aria-hidden />
        <span>Something wrong? Get help</span>
        <CaretDown size={20} aria-hidden />
      </HelpRow>

      <Chips className="options" id={`help-${booking.id}`} role="group" aria-label="What went wrong?">
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
        <Form className="options">
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
