"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import { X } from "@/components/icons";
import { lockScroll, unlockScroll } from "@/lib/ui/useScrollLock";

/**
 * The app's modal primitive — a bottom sheet on phones, a centred dialog on
 * desktop. This is the web stand-in for mobile's `@gorhom/bottom-sheet`, and is
 * shared by the post form, the driver-KYC form and the alert composer.
 *
 * Nothing renders on the server: the portal is guarded by a `mounted` flag so
 * `StyledRegistry` never has to flush portal CSS during SSR and hydration can't
 * mismatch.
 */

/* ── Escape handling ──────────────────────────────────────────────────────
   Drawers nest (the composer opens over the alerts panel; KYC over the mode
   toggle). A module-level stack means Escape only ever closes the topmost. */
const stack: string[] = [];

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* ── Styles ── */

const fade = keyframes`from { opacity: 0 } to { opacity: 1 }`;
const riseUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  /* Clears every other layer: AppHeader 40, NotificationToast 60,
     SupportDock 96, ScrollProgress 100. */
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: ${({ theme }) => theme.color.bg}b8;
  backdrop-filter: blur(6px);
  animation: ${fade} 0.2s ease both;

  @media (min-width: 860px) {
    align-items: center;
    padding: 24px;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Panel = styled.div<{ $size: "sm" | "md" | "lg" }>`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: min(88dvh, 780px);
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.card};
  border-radius: ${({ theme }) => theme.radius.xl} ${({ theme }) => theme.radius.xl} 0 0;
  animation: ${riseUp} 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
  outline: none;

  @media (min-width: 860px) {
    border-radius: ${({ theme }) => theme.radius.lg};
    max-width: ${({ $size }) =>
      $size === "sm" ? "420px" : $size === "lg" ? "760px" : "560px"};
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Grip = styled.div`
  width: 42px;
  height: 4px;
  margin: 10px auto 0;
  border-radius: 999px;
  flex: none;
  background: ${({ theme }) => theme.color.outlineVariant};

  @media (min-width: 860px) {
    display: none;
  }
`;

const Head = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.lg}
    ${({ theme }) => theme.space.xl} ${({ theme }) => theme.space.md};
  flex: none;

  .copy {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: ${({ theme }) => theme.type.subhead};
    font-weight: 600;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 4px 0 0;
    font-size: ${({ theme }) => theme.type.label};
    line-height: 1.45;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Close = styled.button`
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;

  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.color.surfaceContainerHighest};
      color: ${({ theme }) => theme.color.onSurface};
    }
  }
  &:active {
    background: ${({ theme }) => theme.color.surfaceContainerHighest};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const DrawerBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: ${({ theme }) => theme.space.xs}
    ${({ theme }) => theme.space.xl} ${({ theme }) => theme.space.xl};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};

  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.color.outlineVariant} transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.color.outlineVariant};
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }
`;

export const DrawerFooter = styled.footer`
  flex: none;
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.lg}
    ${({ theme }) => theme.space.xl}
    calc(${({ theme }) => theme.space.lg} + env(safe-area-inset-bottom));
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  border-radius: 0 0 ${({ theme }) => theme.radius.lg} ${({ theme }) => theme.radius.lg};

  > * {
    min-height: 48px;
  }
`;

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  /** False while a submit is in flight — suppresses Escape, overlay and the X. */
  dismissible?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  footer?: ReactNode;
  children: ReactNode;
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  size = "md",
  dismissible = true,
  initialFocusRef,
  footer,
  children,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const id = useId();

  // Callers pass `onClose` as an inline arrow and `dismissible` flips while a
  // submit is in flight. Reading both through refs keeps the effect below
  // dependent on `open` alone — otherwise it would tear down and re-run on
  // every parent render, stealing focus mid-keystroke and thrashing the
  // scroll lock.
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  const initialFocusRefRef = useRef(initialFocusRef);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;
  initialFocusRefRef.current = initialFocusRef;

  useEffect(() => setMounted(true), []);

  // Own the Escape stack, the scroll lock, and focus restoration together —
  // they share exactly the same lifetime.
  useEffect(() => {
    if (!open) return;

    stack.push(id);
    lockScroll();
    restoreRef.current = document.activeElement as HTMLElement | null;

    const focusTarget = initialFocusRefRef.current?.current ?? panelRef.current;
    focusTarget?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (stack[stack.length - 1] !== id) return; // not the topmost drawer
      if (!dismissibleRef.current) return;
      event.stopPropagation();
      onCloseRef.current();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const at = stack.indexOf(id);
      if (at !== -1) stack.splice(at, 1);
      unlockScroll();
      restoreRef.current?.focus();
    };
  }, [open, id]);

  const trapTab = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <Overlay
      // mousedown, not click: a text selection that starts inside the panel and
      // releases on the scrim should not close the drawer.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
    >
      <Panel
        ref={panelRef}
        $size={size}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        onKeyDown={trapTab}
      >
        <Grip />
        <Head>
          <div className="copy">
            <h2 id={`${id}-title`}>{title}</h2>
            {description && <p id={`${id}-desc`}>{description}</p>}
          </div>
          <Close
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Close"
          >
            <X size={20} weight="bold" />
          </Close>
        </Head>
        {children}
        {footer}
      </Panel>
    </Overlay>,
    document.body,
  );
}
