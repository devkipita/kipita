"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { CaretDown, Check, CheckCircle } from "@/components/icons";
import { formatTripDate } from "@/lib/trips/format";
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

  .tile {
    display: grid;
    flex: none;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${nocturne.popoverControl};
    color: ${nocturne.cream};
    --icon-knockout: ${nocturne.popoverControl};
  }
  .label {
    flex: 1;
    min-width: 0;
  }
  .caret {
    transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);
  }
`;

const Form = styled(FadeIn)`
  display: grid;
  gap: 12px;
  margin: 0 0 12px;
  padding: 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .field {
    display: grid;
    gap: 8px;
  }
  .label {
    font-size: 14px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  textarea {
    width: 100%;
    min-height: 112px;
    padding: 12px 16px;
    border: 1.5px solid ${nocturne.outline};
    border-radius: 12px;
    background: ${nocturne.surface};
    color: ${nocturne.cream};
    font: inherit;
    font-size: 16px;
    line-height: 24px;
    resize: none;
    field-sizing: content;
    transition: border-color ${dur.state} ${ease.standard};
  }
  textarea::placeholder {
    color: ${nocturne.muted2};
  }
  textarea:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
  }
  .hint {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
`;

const Picks = styled.div`
  display: grid;
  gap: 4px;
`;

const Pick = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 8px 12px;
  border: 0;
  border-radius: 12px;
  background: ${({ $on }) => ($on ? nocturne.surface : "transparent")};
  box-shadow: ${({ $on }) => ($on ? `inset 0 0 0 2px ${nocturne.green}` : "none")};
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  .copy {
    display: grid;
    flex: 1;
    min-width: 0;
  }
  .copy b {
    overflow: hidden;
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .copy small {
    font-size: 13px;
    color: ${nocturne.muted};
    font-variant-numeric: tabular-nums;
  }
  .dot {
    display: grid;
    flex: none;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px ${({ $on }) => ($on ? nocturne.green : nocturne.outline)};
    background: ${({ $on }) => ($on ? nocturne.green : "transparent")};
    color: ${nocturne.onGreen};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${({ $on }) => ($on ? nocturne.surface : `color-mix(in oklab, ${nocturne.surface} 60%, transparent)`)};
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

const More = styled.button`
  justify-self: start;
  min-height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: ${nocturne.green};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${({ theme }) => theme.tone.green.bg};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const SHOWN = 4;

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
  const [showAll, setShowAll] = useState(false);
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
  const recent = [...trips].sort((a, b) =>
    (b.trip?.departure_date ?? b.created_at ?? "").localeCompare(a.trip?.departure_date ?? a.created_at ?? ""),
  );
  const listed = showAll ? recent : recent.slice(0, SHOWN);
  const picked = recent.find((b) => b.id === bookingId);
  if (picked && !listed.includes(picked)) listed.push(picked);

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
              <span className="tile" aria-hidden>
                <Icon size={20} />
              </span>
              <span className="label">{t.subject}</span>
              <span className="caret" aria-hidden>
                <CaretDown size={20} />
              </span>
            </Topic>

            {open && (
              <Form>
                {error && <Notice $variant="error">{error}</Notice>}

                {recent.length > 0 && (
                  <div className="field">
                    <span className="label" id={`case-trip-${t.key}`}>
                      Which trip?
                    </span>
                    <Picks role="radiogroup" aria-labelledby={`case-trip-${t.key}`}>
                      <Pick
                        type="button"
                        role="radio"
                        aria-checked={bookingId === ""}
                        $on={bookingId === ""}
                        onClick={() => setBookingId("")}
                      >
                        <span className="copy">
                          <b>Not about a specific trip</b>
                        </span>
                        <span className="dot" aria-hidden>
                          {bookingId === "" ? <Check size={16} weight="bold" /> : null}
                        </span>
                      </Pick>
                      {listed.map((b) => {
                        const on = bookingId === b.id;
                        const when = formatTripDate(b.trip?.departure_date ?? null);
                        return (
                          <Pick
                            key={b.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            $on={on}
                            onClick={() => setBookingId(b.id)}
                          >
                            <span className="copy">
                              <b>
                                {b.trip?.from_location} to {b.trip?.to_location}
                              </b>
                              <small>{[when, b.booking_reference].filter(Boolean).join(" · ")}</small>
                            </span>
                            <span className="dot" aria-hidden>
                              {on ? <Check size={16} weight="bold" /> : null}
                            </span>
                          </Pick>
                        );
                      })}
                    </Picks>
                    {recent.length > SHOWN && (
                      <More type="button" onClick={() => setShowAll((v) => !v)}>
                        {showAll ? "Show fewer trips" : `Show all ${recent.length} trips`}
                      </More>
                    )}
                  </div>
                )}

                <div className="field">
                  <label className="label" htmlFor={`case-detail-${t.key}`}>
                    What happened?
                  </label>
                  <textarea
                    id={`case-detail-${t.key}`}
                    value={detail}
                    maxLength={2000}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="Times, names, what you expected"
                  />
                  {short && <p className="hint">Add a little more so we can help.</p>}
                </div>

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
