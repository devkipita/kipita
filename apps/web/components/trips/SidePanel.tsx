"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import styled, { css } from "styled-components";
import { X } from "@/components/icons";
import { dur as m3, ease as motionEase } from "@/lib/motion";
import { dur, ease, nocturne } from "@/lib/nocturne";

export type PanelMode = "map" | "sheet" | "float";

export const DOCK_W = 400;

export const PANEL_IN = `${m3.long1}ms ${ease.enter}`;
export const PANEL_OUT = `${m3.medium2}ms ${ease.exit}`;
export const PANEL_IN_MS = m3.long1;

const Layer = styled.aside<{ $open: boolean; $mode: PanelMode }>`
  position: absolute;
  z-index: 5;
  display: flex;
  flex-direction: column;
  background: ${nocturne.bg};
  visibility: ${({ $open }) => ($open ? "visible" : "hidden")};

  ${({ $mode, $open }) => {
    const t = $open ? PANEL_IN : PANEL_OUT;
    const hide = `visibility 0s linear ${$open ? "0s" : `${m3.medium2}ms`}`;
    if ($mode === "map") {
      return css`
        position: fixed;
        z-index: 30;
        top: calc(var(--topbar-h, 64px) + 16px);
        right: var(--dock-r, 24px);
        bottom: 16px;
        width: var(--dock-w, ${DOCK_W}px);
        border-radius: 20px;
        overflow: hidden;
        background: ${nocturne.surface};
        clip-path: ${$open ? "inset(0 0 0 0 round 20px)" : "inset(0 0 0 100% round 20px)"};
        transition: clip-path ${t}, ${hide};
      `;
    }
    if ($mode === "sheet") {
      const slide = $open ? `${m3.long2}ms ${motionEase.sheet}` : `${m3.medium2}ms ${motionEase.sheet}`;
      return css`
        position: fixed;
        z-index: 1100;
        left: 0;
        right: 0;
        bottom: 0;
        max-height: calc(100dvh - var(--topbar-h, 56px) - 24px);
        padding-bottom: env(safe-area-inset-bottom);
        border-radius: 24px 24px 0 0;
        background: ${nocturne.bg};
        box-shadow: ${nocturne.panelShadow};
        transform: translate3d(0, ${$open ? "0" : "100%"}, 0);
        transition: transform ${slide}, ${hide};
        will-change: transform;

        &[data-dragging] {
          transition: none;
        }
      `;
    }
    return css`
      position: fixed;
      z-index: 1100;
      top: var(--topbar-h, 64px);
      right: 0;
      bottom: var(--bottom-bar-space, 0px);
      width: min(420px, 100%);
      box-shadow: ${nocturne.panelShadow};
      transform: translateX(${$open ? "0" : "100%"});
      transition: transform ${t}, ${hide};
    `;
  }}

  @media (prefers-reduced-motion: reduce) {
    clip-path: none;
    transition: none;
    ${({ $mode }) => ($mode === "sheet" ? "" : "transform: none;")}
    ${({ $mode, $open }) => ($mode === "sheet" && !$open ? "visibility: hidden;" : "")}
  }
`;

const DragZone = styled.div<{ $sheet: boolean }>`
  flex: none;

  ${({ $sheet }) =>
    $sheet &&
    css`
      touch-action: none;
      cursor: grab;

      &:active {
        cursor: grabbing;
      }
    `}
`;

const Grip = styled.span`
  display: block;
  flex: none;
  width: 44px;
  height: 5px;
  margin: 10px auto 0;
  border-radius: 999px;
  background: ${nocturne.muted2};
`;

const Scrim = styled.div<{ $open: boolean }>`
  position: fixed;
  z-index: 1090;
  inset: 0;
  background: color-mix(in oklab, ${nocturne.ink} 40%, transparent);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: opacity ${({ $open }) => ($open ? PANEL_IN : PANEL_OUT)};
`;

const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid ${nocturne.line};

  h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Close = styled.button`
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1.5px solid ${nocturne.muted2};
  border-radius: 50%;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  cursor: pointer;
  transition: transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

export const PanelBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
`;

export const PanelFoot = styled.footer`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid ${nocturne.line};
`;

export function SidePanel({
  open,
  mode,
  title,
  closeLabel,
  onClose,
  locked = false,
  children,
}: {
  open: boolean;
  mode: PanelMode;
  title: string;
  closeLabel: string;
  onClose: () => void;
  locked?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(open));
    return () => cancelAnimationFrame(r);
  }, [open]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const lockRef = useRef(locked);
  lockRef.current = locked;

  useEffect(() => {
    if (!open) return;
    back.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const target = ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? ref.current?.querySelector<HTMLElement>("button");
      target?.focus({ preventScroll: true });
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lockRef.current) {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      back.current?.focus({ preventScroll: true });
    };
  }, [open]);

  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);

  function dragStart(e: PointerEvent<HTMLDivElement>) {
    if (mode !== "sheet" || locked || (e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    ref.current?.setAttribute("data-dragging", "");
  }

  function dragMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const raw = e.clientY - d.y;
    d.dy = raw < 0 ? raw * 0.15 : raw;
    el.style.transform = `translate3d(0, ${d.dy}px, 0)`;
  }

  function dragEnd() {
    const d = drag.current;
    const el = ref.current;
    drag.current = null;
    if (!d || !el) return;
    el.removeAttribute("data-dragging");
    const speed = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > 120 || speed > 0.5) {
      onClose();
      requestAnimationFrame(() => {
        el.style.transform = "";
      });
      return;
    }
    el.style.transform = "";
  }

  return (
    <>
    {mode === "sheet" && <Scrim $open={shown && open} onClick={() => !locked && onClose()} aria-hidden />}
    <Layer ref={ref} $open={shown && open} $mode={mode} aria-hidden={!open} inert={!open} aria-label={title}>
      <DragZone
        $sheet={mode === "sheet"}
        onPointerDown={dragStart}
        onPointerMove={dragMove}
        onPointerUp={dragEnd}
        onPointerCancel={dragEnd}
      >
        {mode === "sheet" && <Grip aria-hidden />}
        <Head>
          <h2>{title}</h2>
          <Close type="button" aria-label={closeLabel} onClick={onClose} disabled={locked}>
            <X size={18} weight="bold" />
          </Close>
        </Head>
      </DragZone>
      {children}
    </Layer>
    </>
  );
}
