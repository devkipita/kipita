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

/* ── Scroll lock ──────────────────────────────────────────────────────────
   Reference-counted, so closing an inner drawer doesn't unlock the page while
   an outer one is still open. `position: fixed` rather than `overflow: hidden`
   because iOS Safari ignores the latter and scrolls the body behind the sheet.
   The scrollbar-width padding stops the sticky AppHeader jumping on lock. */
let lockCount = 0;
let lockedScrollY = 0;

function lockScroll() {
  if (lockCount++ > 0) return;
  lockedScrollY = window.scrollY;
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  const { style } = document.body;
  style.position = "fixed";
  style.top = `-${lockedScrollY}px`;
  style.left = "0";
  style.right = "0";
  style.overflow = "hidden";
  if (gutter > 0) style.paddingRight = `${gutter}px`;
}

function unlockScroll() {
  if (--lockCount > 0) return;
  lockCount = 0;
  const { style } = document.body;
  style.position = "";
  style.top = "";
  style.left = "";
  style.right = "";
  style.overflow = "";
  style.paddingRight = "";
  window.scrollTo(0, lockedScrollY);
}

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
  background: ${({ theme }) => theme.color.line};

  @media (min-width: 860px) {
    display: none;
  }
`;

const Head = styled.header`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px 12px;
  flex: none;

  .copy {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-size: 1.22rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 4px 0 0;
    font-size: 0.89rem;
    line-height: 1.45;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const Close = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surface2};
  color: ${({ theme }) => theme.color.textSoft};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.text};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

export const DrawerBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 4px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const DrawerFooter = styled.footer`
  flex: none;
  display: flex;
  gap: 12px;
  padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  border-radius: 0 0 ${({ theme }) => theme.radius.lg} ${({ theme }) => theme.radius.lg};
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
            <X size={18} />
          </Close>
        </Head>
        {children}
        {footer}
      </Panel>
    </Overlay>,
    document.body,
  );
}
