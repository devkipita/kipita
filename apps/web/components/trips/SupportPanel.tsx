"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { ArrowOut, Check } from "@/components/icons";
import { useSupport } from "@/components/support/SupportProvider";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { HELP_TOPICS } from "@/lib/trips/copy";
import { openSupportCaseAction } from "@/lib/support/actions";
import type { Booking } from "@/lib/trips/types";

const Panel = styled.div`
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  overflow: hidden;
`;

const Topic = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
  min-height: 72px;
  padding: 18px 24px;
  border: none;
  background: transparent;
  font: inherit;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: 1.4rem;
  font-weight: 500;
  letter-spacing: -0.022em;
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => theme.color.onSurface};

  &:hover {
    background: ${({ theme }) => theme.color.surfaceContainer};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: -2px;
  }

  svg {
    flex: none;
    color: ${({ theme, $open }) =>
      $open ? theme.color.primary : theme.color.onSurfaceVariant};
    transform: rotate(${({ $open }) => ($open ? 90 : 0)}deg);
    transition: transform 0.22s ease, color 0.22s ease;
  }
  &:hover svg {
    color: ${({ theme }) => theme.color.primary};
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`;

const Item = styled.div`
  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  }
`;

const Form = styled.div`
  display: grid;
  gap: 12px;
  padding: 0 22px 22px;

  label {
    font-size: 0.86rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }

  textarea,
  select {
    width: 100%;
    border: none;
    border-radius: ${({ theme }) => theme.radius.xs};
    padding: 11px 13px;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurface};
    font: inherit;
    font-size: 0.96rem;
  }
  textarea {
    min-height: 104px;
    line-height: 1.55;
    resize: vertical;
  }
  textarea:focus-visible,
  select:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 1px;
  }

  .acts {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
`;

const Done = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 16px 18px;
  font-size: 0.98rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.onSuccessContainer};
  background: ${({ theme }) => theme.color.successContainer};

  svg {
    flex: none;
  }
`;

export function SupportPanel({ trips }: { trips: Booking[] }) {
  // Opening a case is the provider's job — this component only collects it.
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
        setError(result.error ?? "We couldn't open that case.");
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
      <Panel>
        <Done>
          <Check size={18} />
          Case opened. Track it from the Support button.
        </Done>
      </Panel>
    );
  }

  return (
    <Panel>
      {HELP_TOPICS.map((t) => {
        const open = topic === t.key;
        return (
          <Item key={t.key}>
            <Topic
              type="button"
              $open={open}
              aria-expanded={open}
              onClick={() => setTopic(open ? null : t.key)}
            >
              {t.subject}
              <ArrowOut size={30} />
            </Topic>

            {open && (
              <Form>
                {error && <Notice $variant="error">{error}</Notice>}

                {trips.length > 0 && (
                  <>
                    <label htmlFor="case-trip">Which trip?</label>
                    <select
                      id="case-trip"
                      value={bookingId}
                      onChange={(e) => setBookingId(e.target.value)}
                    >
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
                  placeholder="Include times, names and what you expected."
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
                    onClick={() => submit(t.subject, t.category)}
                    disabled={pending || detail.trim().length < 10}
                  >
                    {pending ? "Opening…" : "Open case"}
                  </ButtonEl>
                </div>
              </Form>
            )}
          </Item>
        );
      })}
    </Panel>
  );
}
