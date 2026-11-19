"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styled, { css } from "styled-components";
import { X } from "@/components/icons";
import { dur as m3 } from "@/lib/motion";
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
        clip-path: ${$open ? "inset(0 0 0 0 round 24px 24px 0 0)" : "inset(100% 0 0 0 round 24px 24px 0 0)"};
        transition: clip-path ${t}, ${hide};
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
    transform: none;
    clip-path: none;
    transition: none;
  }
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

  return (
    <>
    {mode === "sheet" && <Scrim $open={shown && open} onClick={() => !locked && onClose()} aria-hidden />}
    <Layer ref={ref} $open={shown && open} $mode={mode} aria-hidden={!open} inert={!open} aria-label={title}>
      {mode === "sheet" && <Grip aria-hidden />}
      <Head>
        <h2>{title}</h2>
        <Close type="button" aria-label={closeLabel} onClick={onClose} disabled={locked}>
          <X size={18} weight="bold" />
        </Close>
      </Head>
      {children}
    </Layer>
    </>
  );
}
