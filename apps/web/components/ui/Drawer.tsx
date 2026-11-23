"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import styled, { css } from "styled-components";
import {
  AnimatePresence,
  m,
  useDragControls,
  useMotionValue,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";
import { X } from "@/components/icons";
import { lockScroll, unlockScroll } from "@/lib/ui/useScrollLock";
import { spring, tween } from "@/lib/motion";

const stack: string[] = [];

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const SHEET_QUERY = "(max-width: 859px)";
const SIDE_W = 400;
const SIDE_GAP = 16;
const SIDE_HIDDEN = "inset(0 0 0 100% round 20px)";
const SIDE_SHOWN = "inset(0 0 0 0% round 20px)";
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 600;

const Overlay = styled(m.div)`
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @media (min-width: 860px) {
    align-items: center;
    padding: 24px;
  }
`;

const Scrim = styled(m.div).attrs<{ $opacity: MotionValue<number> }>(({ $opacity }) => ({
  style: { opacity: $opacity },
}))`
  position: absolute;
  inset: 0;
  background: color-mix(in oklab, ${({ theme }) => theme.color.bg} 72%, transparent);
  backdrop-filter: blur(6px);
`;

const Panel = styled(m.div).attrs<{
  $size: "sm" | "md" | "lg";
  $fill: boolean;
  $y: MotionValue<number>;
}>(({ $y }) => ({ style: { y: $y } }))`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: min(88dvh, 780px);

  ${({ $fill }) =>
    $fill &&
    css`
      @media (max-width: 859px) {
        height: calc(100dvh - 10px - env(safe-area-inset-top));
        max-height: none;
      }
    `}
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.card};
  border-radius: ${({ theme }) => theme.radius.xl} ${({ theme }) => theme.radius.xl} 0 0;
  outline: none;
  will-change: transform;

  @media (min-width: 860px) {
    border-radius: ${({ theme }) => theme.radius.lg};
    max-width: ${({ $size }) =>
      $size === "sm" ? "420px" : $size === "lg" ? "760px" : "560px"};
  }
`;

const SidePanel = styled(m.div)`
  position: fixed;
  z-index: 150;
  top: calc(var(--topbar-h, 64px) + ${SIDE_GAP}px);
  right: ${SIDE_GAP}px;
  bottom: ${SIDE_GAP}px;
  display: flex;
  flex-direction: column;
  width: ${SIDE_W}px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.card};
  outline: none;
`;

const Handle = styled.div`
  flex: none;
  touch-action: none;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  @media (min-width: 860px) {
    touch-action: auto;
    cursor: auto;
  }
`;

const Grip = styled.div`
  width: 42px;
  height: 4px;
  margin: 10px auto 0;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.outline};

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
  transition:
    background 0.16s ease,
    color 0.16s ease,
    transform 0.15s ease;

  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.color.surfaceContainerHighest};
      color: ${({ theme }) => theme.color.onSurface};
    }
  }
  &:active {
    background: ${({ theme }) => theme.color.surfaceContainerHighest};
    transform: scale(0.94);
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
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
  fill?: boolean;
  side?: boolean;
  dismissible?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  footer?: ReactNode;
  children: ReactNode;
};

function useRoomy(): boolean {
  const [roomy, setRoomy] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1200px)");
    const sync = () => setRoomy(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return roomy;
}

export function useIsSheet(): boolean {
  const [sheet, setSheet] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia(SHEET_QUERY);
    const sync = () => setSheet(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return sheet;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  size = "md",
  fill = false,
  side = false,
  dismissible = true,
  initialFocusRef,
  footer,
  children,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const id = useId();
  const sheet = useIsSheet();
  const roomy = useRoomy();
  const pushing = side && !sheet && roomy;
  const drag = useDragControls();
  const y = useMotionValue(0);
  const scrim = useTransform(y, (offset) => {
    const height = panelRef.current?.offsetHeight;
    if (!height) return 1;
    return 1 - Math.min(Math.max(offset / height, 0), 1);
  });

  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  const initialFocusRefRef = useRef(initialFocusRef);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;
  initialFocusRefRef.current = initialFocusRef;

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const active = document.activeElement as HTMLElement | null;
    if (active && !panel?.contains(active)) restoreRef.current = active;
    const trigger = restoreRef.current;
    if (!panel || sheet || pushing) return;
    const from = trigger && trigger !== document.body ? trigger.getBoundingClientRect() : null;
    const box = panel.getBoundingClientRect();
    panel.style.transformOrigin = from
      ? `${from.left + from.width / 2 - box.left}px ${from.top + from.height / 2 - box.top}px`
      : "50% 50%";
  }, [open, sheet, pushing, mounted]);

  useEffect(() => {
    if (!open) return;

    stack.push(id);
    if (!pushing) lockScroll();

    const focusTarget = initialFocusRefRef.current?.current ?? panelRef.current;
    focusTarget?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (stack[stack.length - 1] !== id) return;
      if (!dismissibleRef.current) return;
      event.stopPropagation();
      onCloseRef.current();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const at = stack.indexOf(id);
      if (at !== -1) stack.splice(at, 1);
      if (!pushing) unlockScroll();
      restoreRef.current?.focus({ preventScroll: true });
    };
  }, [open, id, pushing]);

  useEffect(() => {
    if (!open || !pushing) return;
    const root = document.documentElement;
    root.style.setProperty("--side-panel", `${SIDE_W + SIDE_GAP * 2}px`);
    return () => {
      root.style.removeProperty("--side-panel");
    };
  }, [open, pushing]);

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

  const startDrag = (event: React.PointerEvent) => {
    if (!sheet || !dismissible) return;
    if ((event.target as HTMLElement).closest("button")) return;
    drag.start(event);
  };

  const endDrag = (_: unknown, info: PanInfo) => {
    if (!dismissibleRef.current) return;
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) onCloseRef.current();
  };

  if (!mounted) return null;

  const offscreen = window.innerHeight;

  const head = (
    <Head>
      <div className="copy">
        <h2 id={`${id}-title`}>{title}</h2>
        {description && <p id={`${id}-desc`}>{description}</p>}
      </div>
      <Close type="button" onClick={onClose} disabled={!dismissible} aria-label={`Close ${title}`}>
        <X size={20} weight="bold" />
      </Close>
    </Head>
  );

  if (pushing) {
    return createPortal(
      <AnimatePresence>
        {open && (
          <SidePanel
            key="side"
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby={`${id}-title`}
            aria-describedby={description ? `${id}-desc` : undefined}
            tabIndex={-1}
            initial={{ clipPath: SIDE_HIDDEN }}
            animate={{ clipPath: SIDE_SHOWN, transition: spring.sheet }}
            exit={{ clipPath: SIDE_HIDDEN, transition: tween.exit }}
          >
            {head}
            {children}
            {footer}
          </SidePanel>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <Overlay
          key="drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: tween.enter }}
          exit={{ opacity: 0, transition: tween.exit }}
        >
          <Scrim
            $opacity={scrim}
            onMouseDown={() => {
              if (dismissible) onClose();
            }}
          />
          <Panel
            ref={panelRef}
            $size={size}
            $fill={fill}
            $y={y}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={description ? `${id}-desc` : undefined}
            tabIndex={-1}
            onKeyDown={trapTab}
            drag={sheet ? "y" : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 1 }}
            onDragEnd={endDrag}
            initial={sheet ? { y: offscreen } : { opacity: 0, scale: 0.9 }}
            animate={sheet ? { y: 0, transition: spring.sheet } : { opacity: 1, scale: 1, transition: spring.morph }}
            exit={sheet ? { y: offscreen, transition: tween.exit } : { opacity: 0, scale: 0.94, transition: tween.exit }}
          >
            <Handle onPointerDown={startDrag}>
              <Grip />
              {head}
            </Handle>
            {children}
            {footer}
          </Panel>
        </Overlay>
      )}
    </AnimatePresence>,
    document.body,
  );
}
