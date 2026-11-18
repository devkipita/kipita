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
import styled from "styled-components";
import { m, useReducedMotion } from "motion/react";
import { nocturne } from "@/lib/nocturne";
import { spring, tween } from "@/lib/motion";

const RADIUS = 20;
const ITEM = '[role="menuitem"]';

const Panel = styled(m.div)<{ $align: "start" | "end" }>`
  position: absolute;
  top: 0;
  ${({ $align }) => ($align === "end" ? "right: 0;" : "left: 0;")}
  z-index: 2;
  display: flex;
  flex-direction: column;
  width: min(288px, calc(100vw - 24px));
  border-radius: ${RADIUS}px;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.panelShadow};
  color: ${nocturne.cream};
  outline: none;
  visibility: hidden;
`;

const Head = styled.div<{ $align: "start" | "end" }>`
  display: flex;
  justify-content: ${({ $align }) => ($align === "end" ? "flex-end" : "flex-start")};
`;

const Items = styled.div`
  display: grid;
  gap: 2px;
  padding: 8px;
`;

type Geom = { w: number; h: number; W: number; H: number };

function clipFor(g: Geom | null, open: boolean, align: "start" | "end"): string {
  if (!g) return `inset(0px 0px 100% 100% round ${RADIUS}px)`;
  if (open) return `inset(0px 0px 0px 0px round ${RADIUS}px)`;
  const side = Math.max(g.W - g.w, 0);
  const bottom = Math.max(g.H - g.h, 0);
  return align === "end"
    ? `inset(0px 0px ${bottom}px ${side}px round ${g.h / 2}px)`
    : `inset(0px ${side}px ${bottom}px 0px round ${g.h / 2}px)`;
}

export function MorphMenu({
  open,
  onClose,
  triggerRef,
  label,
  head,
  align = "end",
  children,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  label: string;
  head: (close: () => void, open: boolean) => ReactNode;
  align?: "start" | "end";
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [geom, setGeom] = useState<Geom | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const t = triggerRef.current;
    const p = panelRef.current;
    if (!t || !p) return;
    setGeom({ w: t.offsetWidth, h: t.offsetHeight, W: p.offsetWidth, H: p.offsetHeight });
  }, [open, triggerRef]);

  const close = useCallback(
    (refocus: boolean) => {
      onCloseRef.current();
      if (refocus) triggerRef.current?.focus({ preventScroll: true });
    },
    [triggerRef],
  );

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        panelRef.current?.querySelector<HTMLElement>(ITEM)?.focus({ preventScroll: true }),
      ),
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close(true);
    };
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, close]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEM) ?? []);
    if (!items.length) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? items.length - 1
          : e.key === "ArrowDown"
            ? (at + 1) % items.length
            : (at - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <Panel
      ref={panelRef}
      $align={align}
      role="menu"
      aria-label={label}
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      initial={false}
      animate={
        open
          ? { clipPath: clipFor(geom, true, align), visibility: "visible" }
          : { clipPath: clipFor(geom, false, align), transitionEnd: { visibility: "hidden" } }
      }
      transition={reduce ? { duration: 0 } : open ? spring.morph : tween.exit}
    >
      <Head $align={align}>{head(() => close(true), open)}</Head>
      <Items>{children}</Items>
    </Panel>
  );
}
