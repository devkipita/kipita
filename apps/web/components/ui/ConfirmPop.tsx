"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

export type ConfirmAsk = {
  title: string;
  yes: string;
  no: string;
  danger?: boolean;
};

type Open = ConfirmAsk & {
  rect: DOMRect;
  resolve: (ok: boolean) => void;
};

const grow = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
`;

const Pop = styled.div`
  position: fixed;
  z-index: 1200;
  display: grid;
  gap: 14px;
  width: min(320px, calc(100vw - 32px));
  padding: 18px;
  border-radius: 20px;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.panelShadow};
  animation: ${grow} ${dur.state} ${ease.enter};

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Btns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const Btn = styled.button<{ $tone: "keep" | "go" | "danger" }>`
  min-height: 46px;
  padding: 0 12px;
  border-radius: 999px;
  border: 2px solid ${({ $tone }) => ($tone === "keep" ? nocturne.green : "transparent")};
  background: ${({ $tone }) =>
    $tone === "keep" ? nocturne.surface : $tone === "danger" ? nocturne.danger : nocturne.green};
  color: ${({ $tone }) => ($tone === "keep" ? nocturne.green : nocturne.onGreen)};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;

  &:active {
    transform: scale(0.97);
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

function ConfirmLayer({ open, onDone }: { open: Open; onDone: (ok: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; origin: string } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { rect } = open;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = rect.left + rect.width / 2;
    const left = Math.min(Math.max(16, cx - w / 2), vw - 16 - w);
    const below = rect.bottom + 8 + h <= vh - 16 || rect.top - 8 - h < 16;
    const top = below ? Math.min(rect.bottom + 8, vh - 16 - h) : rect.top - 8 - h;
    setPlace({ left, top, origin: `${cx - left}px ${below ? 0 : h}px` });
  }, [open]);

  useEffect(() => {
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onDone(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDone(false);
    };
    const onMove = () => onDone(false);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [onDone]);

  return createPortal(
    <Pop
      ref={ref}
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="confirm-pop-title"
      style={
        place
          ? { left: place.left, top: place.top, transformOrigin: place.origin }
          : { left: 0, top: 0, visibility: "hidden" }
      }
    >
      <h2 id="confirm-pop-title">{open.title}</h2>
      <Btns>
        <Btn ref={keepRef} type="button" $tone="keep" onClick={() => onDone(false)}>
          {open.no}
        </Btn>
        <Btn type="button" $tone={open.danger ? "danger" : "go"} onClick={() => onDone(true)}>
          {open.yes}
        </Btn>
      </Btns>
    </Pop>,
    document.body,
  );
}

export function useConfirm(): {
  ask: (anchor: Element | null | undefined, q: ConfirmAsk) => Promise<boolean>;
  confirmNode: ReactNode;
} {
  const [open, setOpen] = useState<Open | null>(null);
  const openRef = useRef<Open | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);

  const ask = useCallback((anchor: Element | null | undefined, q: ConfirmAsk) => {
    openRef.current?.resolve(false);
    anchorRef.current = anchor instanceof HTMLElement ? anchor : null;
    const rect =
      anchor?.getBoundingClientRect() ??
      new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0);
    return new Promise<boolean>((resolve) => {
      const next = { ...q, rect, resolve };
      openRef.current = next;
      setOpen(next);
    });
  }, []);

  const onDone = useCallback((ok: boolean) => {
    const cur = openRef.current;
    openRef.current = null;
    setOpen(null);
    cur?.resolve(ok);
    if (!ok) anchorRef.current?.focus();
  }, []);

  return { ask, confirmNode: open ? <ConfirmLayer open={open} onDone={onDone} /> : null };
}
