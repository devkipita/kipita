"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { Check, Plus } from "@/components/icons";
import { useSupport } from "@/components/support/SupportProvider";
import { Notice } from "@/components/ui/primitives";
import { HELP_TOPICS } from "@/lib/trips/copy";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { Booking } from "@/lib/trips/types";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { HelpPanel, Unfold, rowLook } from "./helpRows";

const Topic = styled.button<{ $open: boolean }>`
  ${rowLook}

  svg {
    transform: rotate(${({ $open }) => ($open ? 45 : 0)}deg);
  }
`;

const Form = styled(Unfold)`
  display: grid;
  gap: 10px;

  label {
    font-size: 13px;
    font-weight: 800;
    color: ${nocturne.muted};
  }
  textarea,
  select {
    width: 100%;
    border: 0;
    border-radius: 14px;
    padding: 12px 14px;
    background: ${nocturne.surface2};
    box-shadow: inset 0 0 0 1px ${nocturne.line};
    color: ${nocturne.cream};
    font: inherit;
    font-size: 16px;
  }
  textarea {
    min-height: 104px;
    line-height: 1.5;
    resize: vertical;
  }
  textarea:focus-visible,
  select:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px ${nocturne.accent};
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
  min-height: 46px;
  border-radius: 999px;
  border: 2px solid ${({ $main }) => ($main ? "transparent" : nocturne.green)};
  background: ${({ $main }) => ($main ? nocturne.green : nocturne.surface)};
  color: ${({ $main }) => ($main ? nocturne.onGreen : nocturne.green)};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Done = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  min-height: 76px;
  font-size: 18px;
  font-weight: 800;
  color: ${nocturne.cream};

  svg {
    flex: none;
    color: ${nocturne.green};
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
        <Done>
          <Check size={20} weight="bold" />
          Report sent
        </Done>
      </HelpPanel>
    );
  }

  return (
    <HelpPanel>
      {HELP_TOPICS.map((t) => {
        const open = topic === t.key;
        return (
          <div key={t.key}>
            <Topic type="button" $open={open} aria-expanded={open} onClick={() => setTopic(open ? null : t.key)}>
              {t.subject}
              <Plus size={28} />
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

                <Btns>
                  <Btn type="button" onClick={() => setTopic(null)}>
                    Discard report
                  </Btn>
                  <Btn
                    type="button"
                    $main
                    onClick={() => submit(t.subject, t.category)}
                    disabled={pending || detail.trim().length < 10}
                    aria-busy={pending}
                  >
                    {pending && <ButtonOrb job="committing" />}
                    Send report
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
