"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import styled, { css } from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

const HEAD = 44;

export function morphHead(glyph: string, fade: string, glyphCentre: number) {
  return css`
    clip-path: inset(-16px -16px 0 0 round ${HEAD / 2}px);
    transition:
      clip-path ${dur.exit} ${ease.exit},
      background ${dur.state} ${ease.standard},
      color ${dur.state} ${ease.standard},
      transform ${dur.press} ${ease.standard};

    ${glyph} {
      transition: transform ${dur.exit} ${ease.exit};
    }
    ${fade} {
      transition:
        opacity ${dur.exit} ${ease.exit},
        filter ${dur.exit} ${ease.exit};
    }

    &::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      width: ${HEAD}px;
      height: ${HEAD}px;
      border-radius: 50%;
      pointer-events: none;
    }

    &[data-morph="open"] {
      clip-path: inset(0 0 0 calc(var(--trigger-w, ${HEAD}px) - ${HEAD}px) round ${HEAD / 2}px);
      transition:
        clip-path ${dur.enter} ${ease.enter},
        background ${dur.state} ${ease.standard},
        color ${dur.state} ${ease.standard},
        transform ${dur.press} ${ease.standard};

      ${glyph} {
        transform: translateX(calc(var(--trigger-w, ${HEAD}px) - ${HEAD / 2 + glyphCentre}px));
        transition: transform ${dur.enter} ${ease.enter};
      }
      ${fade} {
        opacity: 0;
        filter: blur(2px);
        transition:
          opacity ${dur.state} ${ease.exit},
          filter ${dur.state} ${ease.exit};
      }
    }

    &[data-morph="open"]:focus-visible {
      outline: none;
    }
    &[data-morph="open"]:focus-visible::after {
      box-shadow: inset 0 0 0 3px ${nocturne.greenDeep};
    }

    @media (prefers-reduced-motion: reduce) {
      transition:
        background ${dur.state} ${ease.standard},
        color ${dur.state} ${ease.standard};

      &[data-morph="open"] {
        transition:
          background ${dur.state} ${ease.standard},
          color ${dur.state} ${ease.standard};
      }
      ${glyph},
      &[data-morph="open"] ${glyph} {
        transition: none;
      }
    }
  `;
}

export const MorphHeadBar = styled.div`
  position: absolute;
  inset: 0 ${HEAD + 8}px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-left: 4px;
  opacity: 0;
  transition: opacity ${dur.press} ${ease.exit};

  &[data-open="true"] {
    opacity: 1;
    transition: opacity ${dur.state} ${ease.standard} ${dur.press};
  }

  @media (prefers-reduced-motion: reduce) {
    &[data-open="true"] {
      transition: opacity ${dur.state} ${ease.standard};
    }
  }
`;

const RADIUS = 20;
const ITEM = '[role="menuitem"]:not(:disabled)';
const ROW = "[data-row-link]";
const OVERLAY = "[data-overlay]";

const Panel = styled.div<{ $width: number }>`
  position: absolute;
  top: var(--morph-top, -8px);
  right: var(--morph-right, -8px);
  z-index: 2;
  display: flex;
  flex-direction: column;
  width: min(${({ $width }) => $width}px, calc(100vw - 16px));
  border-radius: ${RADIUS}px;
  background: ${nocturne.popover};
  box-shadow: ${nocturne.popoverShadow};
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
  left: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
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
  kind = "menu",
  children,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  label: string;
  head: (close: () => void, open: boolean) => ReactNode;
  width?: number;
  kind?: "menu" | "dialog";
  children: ReactNode;
}) {
  const items = kind === "menu" ? ITEM : ROW;
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
    p.style.setProperty("--trigger-w", `${t.offsetWidth}px`);
    if (headRef.current) {
      headRef.current.style.top = `${top}px`;
      headRef.current.style.right = `${right}px`;
      headRef.current.style.height = `${tr.height}px`;
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
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = kind === "menu" ? panel.querySelector<HTMLElement>(ITEM) : null;
      (first ?? panel).focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector(OVERLAY)) return;
      e.stopPropagation();
      close(true);
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (panelRef.current?.contains(target) || target.closest?.(OVERLAY)) return;
      close(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, close, kind]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const list = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(items) ?? []);
    if (!list.length) return;
    e.preventDefault();
    const at = list.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? list.length - 1
          : e.key === "ArrowDown"
            ? (at + 1) % list.length
            : (at - 1 + list.length) % list.length;
    list[next]?.focus();
  };

  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (kind !== "dialog" || !open) return;
    const next = e.relatedTarget as Element | null;
    if (!next || panelRef.current?.contains(next) || next.closest(OVERLAY)) return;
    if (triggerRef.current?.contains(next)) return;
    onCloseRef.current();
  };

  return (
    <Panel
      ref={panelRef}
      $width={width}
      data-open={open ? "true" : "false"}
      role={kind}
      aria-label={label}
      aria-modal={kind === "dialog" ? false : undefined}
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <Head ref={headRef}>{head(() => close(true), open)}</Head>
      <Items ref={itemsRef}>{children}</Items>
    </Panel>
  );
}
