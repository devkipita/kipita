"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import { Z } from "@/lib/z";
import { useScrollLock } from "@/lib/ui/useScrollLock";

const fade = keyframes`from { opacity: 0 } to { opacity: 1 }`;
const slideIn = keyframes`
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z.drawerOverlay};
  background: ${({ theme }) => theme.color.scrim}52;
  backdrop-filter: blur(4px);
  animation: ${fade} 0.2s ease both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Panel = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: ${Z.drawerOverlay + 1};
  width: min(290px, 84vw);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  border-right: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  animation: ${slideIn} 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export function MobileNavDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <Overlay onClick={onClose} />
      <Panel role="dialog" aria-modal="true" aria-label="Navigation">
        {children}
      </Panel>
    </>,
    document.body,
  );
}
