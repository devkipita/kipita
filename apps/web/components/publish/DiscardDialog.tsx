"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import styled, { css, keyframes } from "styled-components";
import { nocturne } from "@/lib/nocturne";

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const lift = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ring = css`
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  background: rgba(10, 38, 28, 0.45);
  backdrop-filter: blur(4px);
  animation: ${fade} 0.16s ease both;

  /* On a phone the question rises from the bottom, within thumb reach. */
  @media (max-width: 899px) {
    align-items: flex-end;
    padding: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Box = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px 20px 20px;
  box-sizing: border-box;
  border-radius: 22px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  box-shadow: 0 30px 80px -30px rgba(10, 38, 28, 0.6);
  animation: ${lift} 0.2s ease both;

  @media (max-width: 899px) {
    max-width: none;
    border-radius: 22px 22px 0 0;
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  h2 {
    margin: 0;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  p {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    color: ${nocturne.muted};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  margin-top: 6px;

  @media (min-width: 900px) {
    flex-direction: row;
    justify-content: flex-end;
  }
`;

const Keep = styled.button`
  height: 48px;
  padding: 0 18px;
  border-radius: 12px;
  border: 1.5px solid ${nocturne.line};
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  ${ring}
`;

const Discard = styled.button`
  height: 48px;
  padding: 0 18px;
  border-radius: 12px;
  border: 0;
  background: ${nocturne.danger};
  color: ${nocturne.bg};
  font: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  ${ring}
`;

/**
 * Asks before an unpublished ride draft is thrown away. It names what will be
 * lost, says published rides are safe, puts the safe choice first in focus,
 * closes on Escape or a tap outside, and gives focus back to whatever opened it.
 */
export function DiscardDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // Closing without discarding returns focus to the control that asked. After a
  // confirmed discard that control is disabled, so the page places focus itself.
  const cancel = useCallback(() => {
    onCancelRef.current();
    opener.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    keepRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
        return;
      }
      if (e.key !== "Tab") return;
      const buttons = boxRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)");
      if (!buttons || buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, cancel]);

  if (!open) return null;

  return (
    <Backdrop onClick={(e) => e.target === e.currentTarget && cancel()}>
      <Box ref={boxRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
        <h2 id={titleId}>Discard this ride draft?</h2>
        <p id={bodyId}>
          Your route, day, time, seats, price and ride details will be cleared. Rides you have already published are not
          affected.
        </p>
        <Actions>
          <Keep ref={keepRef} type="button" onClick={cancel}>
            Keep editing
          </Keep>
          <Discard type="button" onClick={onConfirm}>
            Discard draft
          </Discard>
        </Actions>
      </Box>
    </Backdrop>
  );
}
