"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { m } from "motion/react";
import { CheckCircle, Star } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { Collapse } from "@/components/anim/Collapse";
import { Swap } from "@/components/anim/Swap";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { spring } from "@/lib/motion";
import { rateBookingAction } from "@/lib/trips/journey-actions";

const WORDS = ["", "Terrible", "Not great", "Okay", "Good", "Excellent"];

const TAGS = {
  driver: {
    good: ["On time", "Smooth driving", "Clean car", "Friendly", "Good music", "Felt safe"],
    bad: ["Late", "Rough driving", "Car not as listed", "Rude", "Took a detour", "Felt unsafe"],
  },
  passenger: {
    good: ["On time", "Respectful", "Easy pickup", "Good company", "Light luggage"],
    bad: ["Late", "Rude", "Hard to find", "Too much luggage", "Messy"],
  },
};

const Wrap = styled.div`
  display: grid;
  gap: 16px;
`;

const Head = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;

  .face {
    border-radius: 50%;
    box-shadow:
      0 0 0 3px ${nocturne.surface},
      0 0 0 5px ${nocturne.lime};
  }
  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.25;
    color: ${nocturne.cream};
  }
  p {
    margin: 3px 0 0;
    font-size: 14px;
    color: ${nocturne.muted};
  }
`;

const Stars = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
`;

const StarBtn = styled.button<{ $on: boolean }>`
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 0;
  border-radius: 16px;
  background: ${({ $on }) => ($on ? `color-mix(in oklab, ${nocturne.star} 14%, ${nocturne.surface})` : nocturne.surface2)};
  color: ${({ $on }) => ($on ? nocturne.star : nocturne.outline)};
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.94);
  }
  &:disabled {
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Word = styled.p`
  margin: -4px 0 0;
  min-height: 24px;
  text-align: center;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 17px;
  font-weight: 800;
  color: ${nocturne.cream};
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  padding-top: 2px;
`;

const Tag = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 6px 14px;
  border: 0;
  border-radius: 12px;
  background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface2)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${({ $on }) => ($on ? nocturne.greenDeep : `color-mix(in oklab, ${nocturne.surface2} 80%, ${nocturne.green})`)};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Note = styled.textarea`
  width: 100%;
  min-height: 72px;
  margin-top: 4px;
  padding: 12px 14px;
  border: 1.5px solid ${nocturne.outline};
  border-radius: 14px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 16px;
  line-height: 1.45;
  resize: vertical;

  &::placeholder {
    color: ${nocturne.muted2};
  }
  &:focus {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
`;

const Send = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  margin-top: 4px;
  border: 0;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    background: ${nocturne.surface3};
    color: ${nocturne.muted};
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const Thanks = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;

  .icon {
    display: grid;
    flex: none;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.successContainer};
    color: ${({ theme }) => theme.color.onSuccessContainer};
  }
  .copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
`;

const Mini = styled.span`
  display: inline-flex;
  gap: 2px;
  color: ${nocturne.star};
`;

const Error = styled.p`
  margin: 0;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: ${nocturne.danger};
`;

export function RateRide({
  bookingId,
  name,
  avatarUrl,
  isDriver,
  initial,
}: {
  bookingId: string;
  name: string;
  avatarUrl: string | null;
  isDriver: boolean;
  initial: number | null | undefined;
}) {
  const first = name.split(" ")[0] || name;
  const [score, setScore] = useState(initial ?? 0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(!!initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const pool = TAGS[isDriver ? "passenger" : "driver"][score >= 4 ? "good" : "bad"];
  const shown = hover || score;

  function pick(n: number) {
    if (done || pending) return;
    if ((n >= 4) !== (score >= 4)) setTags([]);
    setScore(n);
    setError("");
  }

  function toggle(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  function send() {
    if (!score || pending) return;
    const comment = [tags.join(", "), note.trim()].filter(Boolean).join(" · ");
    startTransition(async () => {
      const r = await rateBookingAction(bookingId, score, comment || undefined);
      if (r.ok) setDone(true);
      else setError(r.error);
    });
  }

  return (
    <Swap id={done ? "done" : "ask"}>
      {done ? (
        <Thanks role="status">
          <m.span className="icon" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={spring.success}>
            <CheckCircle size={24} weight="fill" />
          </m.span>
          <span className="copy">
            <b>You rated {first}</b>
            <Mini aria-label={`${score} out of 5 stars`} role="img">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={20} weight={n <= score ? "fill" : "regular"} aria-hidden />
              ))}
            </Mini>
          </span>
        </Thanks>
      ) : (
        <Wrap>
          <Head>
            <span className="face">
              <Avatar name={name} src={avatarUrl} size={56} />
            </span>
            <span>
              <h2>{isDriver ? `How was riding with ${first}?` : `How was your ride with ${first}?`}</h2>
              <p>Tap the stars</p>
            </span>
          </Head>

          <Stars role="radiogroup" aria-label={`Rate ${name}`} onPointerLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <StarBtn
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}, ${WORDS[n]}`}
                $on={n <= shown}
                disabled={pending}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHover(n)}
                onClick={() => pick(n)}
              >
                <m.span
                  key={n <= score ? `on-${score}` : "off"}
                  initial={n <= score ? { scale: 0.6 } : false}
                  animate={{ scale: 1 }}
                  transition={{ ...spring.success, delay: n <= score ? (n - 1) * 0.04 : 0 }}
                >
                  <Star size={28} weight={n <= shown ? "fill" : "regular"} />
                </m.span>
              </StarBtn>
            ))}
          </Stars>

          <Swap id={String(shown)}>
            <Word aria-live="polite">{WORDS[shown]}</Word>
          </Swap>

          <Collapse open={score > 0}>
            <Tags aria-label={score >= 4 ? "What went well" : "What went wrong"}>
              {pool.map((tag) => (
                <Tag key={tag} type="button" aria-pressed={tags.includes(tag)} $on={tags.includes(tag)} onClick={() => toggle(tag)}>
                  {tag}
                </Tag>
              ))}
            </Tags>
            <Note
              aria-label={`Note for ${first}`}
              placeholder={`Add a note for ${first} (optional)`}
              maxLength={280}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Collapse>

          {error ? <Error role="alert">{error}</Error> : null}

          <Send type="button" onClick={send} disabled={!score || pending} aria-busy={pending}>
            {pending ? <ButtonOrb job="committing" /> : null}
            {pending ? "Sending your rating" : score ? `Send ${score}-star rating` : "Choose a star rating"}
          </Send>
        </Wrap>
      )}
    </Swap>
  );
}
