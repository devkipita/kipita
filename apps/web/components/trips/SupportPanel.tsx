"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { CaretRight, CheckCircle } from "@/components/icons";
import { useSupport } from "@/components/support/SupportProvider";
import { Notice } from "@/components/ui/primitives";
import { HELP_TOPICS } from "@/lib/trips/copy";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { Booking } from "@/lib/trips/types";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { FadeIn, HelpPanel, rowPress } from "./helpRows";

const Topic = styled.button<{ $open: boolean }>`
  ${rowPress}
  justify-content: flex-start;

  .label {
    flex: 1;
    min-width: 0;
  }
  .glyph {
    color: ${nocturne.accent};
  }
  .caret {
    transform: rotate(${({ $open }) => ($open ? 90 : 0)}deg);
  }
`;

const Form = styled(FadeIn)`
  display: grid;
  gap: 8px;
  padding: 8px 4px 12px;

  label {
    font-size: 13px;
    font-weight: 700;
    color: ${nocturne.muted};
  }
  textarea,
  select {
    width: 100%;
    border: 0;
    border-radius: 12px;
    padding: 12px;
    background: ${({ theme }) => theme.color.surfaceContainerHighest};
    color: ${nocturne.cream};
    font: inherit;
    font-size: 16px;
    transition: box-shadow ${dur.state} ${ease.standard};
  }
  textarea {
    min-height: 96px;
    line-height: 24px;
    resize: vertical;
  }
  textarea:focus-visible,
  select:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px ${nocturne.accent};
  }
  .hint {
    margin: 0;
    font-size: 13px;
    color: ${nocturne.muted};
  }
`;

const Btns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 4px;
`;

const Btn = styled.button<{ $main?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: ${({ $main, theme }) => ($main ? nocturne.green : theme.tone.surface.bg)};
  color: ${({ $main, theme }) => ($main ? nocturne.onGreen : theme.tone.surface.on)};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    filter ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      filter: brightness(0.94);
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  &:disabled {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${nocturne.muted2};
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Done = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  min-height: 48px;
  padding: 12px;
  border-radius: 12px;
  background: ${({ theme }) => theme.color.successContainer};
  color: ${({ theme }) => theme.color.onSuccessContainer};
  font-size: 15px;
  font-weight: 700;

  svg {
    flex: none;
  }
`;

export function SupportPanel({ trips }: { trips: Booking[] }) {
  const { openCase } = useSupport();
  const [topic, setTopic] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(subject: string, category: string) {
    if (pending) return;
    setError("");

    startTransition(async () => {
      const result = await openCase({
        subject,
        detail,
        category,
        bookingId: bookingId || null,
      });

      if (!result.ok) {
        setError(result.error ?? "We couldn't send that report.");
        return;
      }

      setDone(true);
      setTopic(null);
      setDetail("");
      setBookingId("");
    });
  }

  if (done) {
    return (
      <HelpPanel>
        <Done role="status">
          <CheckCircle size={20} weight="fill" aria-hidden />
          Report sent. We&rsquo;ll reply in Activity.
        </Done>
      </HelpPanel>
    );
  }

  const short = detail.trim().length < 10;

  return (
    <HelpPanel>
      {HELP_TOPICS.map((t) => {
        const open = topic === t.key;
        const Icon = t.icon;
        return (
          <div key={t.key}>
            <Topic
              type="button"
              $open={open}
              aria-expanded={open}
              onClick={() => setTopic(open ? null : t.key)}
            >
              <Icon size={20} className="glyph" aria-hidden />
              <span className="label">{t.subject}</span>
              <CaretRight size={16} className="caret" aria-hidden />
            </Topic>

            {open && (
              <Form>
                {error && <Notice $variant="error">{error}</Notice>}

                {trips.length > 0 && (
                  <>
                    <label htmlFor="case-trip">Which trip?</label>
                    <select id="case-trip" value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
                      <option value="">Not about a specific trip</option>
                      {trips.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.trip?.from_location} to {b.trip?.to_location}
                          {b.booking_reference ? ` · ${b.booking_reference}` : ""}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <label htmlFor="case-detail">What happened?</label>
                <textarea
                  id="case-detail"
                  value={detail}
                  maxLength={2000}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Times, names, what you expected"
                />
                {short && <p className="hint">Add a little more so we can help.</p>}

                <Btns>
                  <Btn type="button" onClick={() => setTopic(null)}>
                    Discard report
                  </Btn>
                  <Btn
                    type="button"
                    $main
                    onClick={() => submit(t.subject, t.category)}
                    disabled={pending || short}
                    aria-busy={pending}
                  >
                    {pending ? (
                      <>
                        <ButtonOrb job="committing" /> Sending report
                      </>
                    ) : (
                      "Send report"
                    )}
                  </Btn>
                </Btns>
              </Form>
            )}
          </div>
        );
      })}
    </HelpPanel>
  );
}
