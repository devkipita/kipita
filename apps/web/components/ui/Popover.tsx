"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { AnimatePresence, m } from "motion/react";
import { nocturne } from "@/lib/nocturne";
import { spring, tween } from "@/lib/motion";
import { Drawer, useIsSheet } from "./Drawer";

type Align = "start" | "center" | "end";

const GAP = 8;
const EDGE = 12;

const Panel = styled(m.div)`
  position: fixed;
  z-index: 1100;
  min-width: 200px;
  max-width: calc(100vw - ${EDGE * 2}px);
  padding: 6px;
  border-radius: 18px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
  box-shadow: ${nocturne.panelShadow};
  color: ${nocturne.cream};
  outline: none;
`;

type Place = { left: number; top: number; origin: string };

function place(anchor: DOMRect, w: number, h: number, align: Align): Place {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const raw =
    align === "start" ? anchor.left : align === "end" ? anchor.right - w : anchor.left + anchor.width / 2 - w / 2;
  const left = Math.min(Math.max(EDGE, raw), vw - EDGE - w);
  const below = anchor.bottom + GAP + h <= vh - EDGE || anchor.top - GAP - h < EDGE;
  const top = below ? Math.min(anchor.bottom + GAP, vh - EDGE - h) : anchor.top - GAP - h;
  const ox = Math.min(Math.max(anchor.left + anchor.width / 2 - left, 0), w);
  return { left, top, origin: `${ox}px ${below ? 0 : h}px` };
}

const ITEM = '[role="menuitem"],[role="menuitemradio"],[role="option"]';

export function Popover({
  open,
  onClose,
  anchorRef,
  label,
  align = "end",
  role = "menu",
  sheetOnPhone = true,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  align?: Align;
  role?: "menu" | "dialog" | "listbox";
  sheetOnPhone?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const phone = useIsSheet();
  const sheet = sheetOnPhone && phone;
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || sheet) return;
    const panel = panelRef.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;
    const p = place(anchor.getBoundingClientRect(), panel.offsetWidth, panel.offsetHeight, align);
    panel.style.left = `${p.left}px`;
    panel.style.top = `${p.top}px`;
    panel.style.transformOrigin = p.origin;
    const first = panel.querySelector<HTMLElement>(`${ITEM},button,a[href],input`);
    (first ?? panel).focus({ preventScroll: true });
  }, [open, sheet, align, anchorRef, mounted]);

  const close = useCallback((refocus: boolean) => {
    onCloseRef.current();
    if (refocus) anchorRef.current?.focus({ preventScroll: true });
  }, [anchorRef]);

  useEffect(() => {
    if (!open || sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      close(false);
    };
    const onMove = () => close(false);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { capture: true, passive: true });
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, sheet, close, anchorRef]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (role === "dialog") return;
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEM) ?? []);
    if (!items.length) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  if (sheet) {
    return (
      <Drawer open={open} onClose={() => close(false)} title={label} size="sm">
        <SheetList role={role} aria-label={label}>
          {children}
        </SheetList>
      </Drawer>
    );
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <Panel
          key="popover"
          ref={panelRef}
          className={className}
          role={role}
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1, transition: spring.morph }}
          exit={{ opacity: 0, scale: 0.96, transition: tween.exit }}
        >
          {children}
        </Panel>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const SheetList = styled.div`
  display: grid;
  gap: 2px;
  padding: 0 12px calc(16px + env(safe-area-inset-bottom));
`;

export const PopoverItem = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: ${nocturne.cream};
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  text-align: left;
  text-decoration: none;
  cursor: pointer;

  svg {
    flex: none;
    color: ${nocturne.muted};
  }

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -3px;
    background: ${nocturne.surface2};
  }
  &[aria-checked="true"] {
    color: ${nocturne.accent};
    font-weight: 800;
  }
  &[data-tone="danger"] {
    color: ${nocturne.danger};

    svg {
      color: ${nocturne.danger};
    }
  }

  @media (max-width: 859px) {
    min-height: 52px;
    font-size: 16px;
  }
`;
