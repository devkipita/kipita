"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import styled from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

const RADIUS = 20;
const ITEM = '[role="menuitem"]:not(:disabled)';

const Panel = styled.div<{ $width: number }>`
  position: absolute;
  top: 0;
  right: var(--morph-right, 0px);
  z-index: 2;
  display: flex;
  flex-direction: column;
  width: min(${({ $width }) => $width}px, calc(100vw - 16px));
  border-radius: ${RADIUS}px;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.panelShadow};
  color: ${nocturne.cream};
  outline: none;
  clip-path: var(--morph-closed, inset(0px 0px 100% 100% round ${RADIUS}px));
  visibility: hidden;
  transition:
    clip-path ${dur.exit} ${ease.exit},
    visibility 0s linear ${dur.exit};

  &[data-open="true"] {
    clip-path: inset(0px 0px 0px 0px round ${RADIUS}px);
    visibility: visible;
    transition:
      clip-path ${dur.enter} ${ease.enter},
      visibility 0s linear 0s;
  }
`;

const Head = styled.div`
  position: absolute;
  z-index: 1;
  display: flex;
`;

const Items = styled.div`
  display: grid;
  gap: 2px;
  padding: 8px;
`;

export function MorphMenu({
  open,
  onClose,
  triggerRef,
  label,
  head,
  width = 288,
  children,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  label: string;
  head: (close: () => void, open: boolean) => ReactNode;
  width?: number;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const measure = useCallback(() => {
    const t = triggerRef.current;
    const p = panelRef.current;
    if (!t || !p) return;
    const tr = t.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    const top = tr.top - pr.top;
    const left = tr.left - pr.left;
    const right = Math.max(pr.width - left - tr.width, 0);
    const bottom = Math.max(pr.height - top - tr.height, 0);
    p.style.setProperty(
      "--morph-closed",
      `inset(${top}px ${right}px ${bottom}px ${left}px round ${tr.height / 2}px)`,
    );
    if (headRef.current) {
      headRef.current.style.top = `${top}px`;
      headRef.current.style.left = `${left}px`;
    }
    if (itemsRef.current) itemsRef.current.style.paddingTop = `${top + tr.height + 6}px`;
  }, [triggerRef]);

  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

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
      panelRef.current?.querySelector<HTMLElement>(ITEM)?.focus({ preventScroll: true }),
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
      $width={width}
      data-open={open ? "true" : "false"}
      role="menu"
      aria-label={label}
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <Head ref={headRef}>{head(() => close(true), open)}</Head>
      <Items ref={itemsRef}>{children}</Items>
    </Panel>
  );
}
