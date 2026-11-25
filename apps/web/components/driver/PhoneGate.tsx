"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import { X } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { PhoneVerifyFlow } from "@/components/profile/PhoneVerifyFlow";

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const lift = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: none; }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  background: rgba(10, 38, 28, 0.55);
  backdrop-filter: blur(6px);
  animation: ${fade} 0.2s ease-out;

  @media (max-width: 899px) {
    padding: 0;
    align-items: flex-end;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Card = styled.div`
  position: relative;
  width: 100%;
  max-width: 460px;
  max-height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 26px 22px calc(24px + env(safe-area-inset-bottom));
  border-radius: 28px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  box-shadow: 0 40px 100px -30px rgba(10, 38, 28, 0.6);
  animation: ${lift} 0.28s cubic-bezier(0.16, 1, 0.3, 1);

  @media (max-width: 899px) {
    max-width: none;
    max-height: 92dvh;
    border-radius: 24px 24px 0 0;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  h2 {
    margin: 0 40px 8px 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.25;
    outline: none;
  }
  p {
    margin: 0 0 18px;
    font-size: 15px;
    line-height: 1.5;
    color: ${nocturne.muted};
  }
`;

const Close = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: ${nocturne.cream};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

/**
 * Shown before the driver verification form when the driver's phone number is not
 * verified yet. The database refuses driver verification without one, so this is
 * the friendly version of that rule. One SMS code, once.
 */
export function PhoneGate({
  open,
  initialPhone,
  onVerified,
  onClose,
}: {
  open: boolean;
  initialPhone?: string | null;
  onVerified: () => void;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <Backdrop onClick={onClose}>
      <Card role="dialog" aria-modal="true" aria-labelledby="phone-gate-title" onClick={(e) => e.stopPropagation()}>
        <Close type="button" aria-label="Not now" onClick={onClose}>
          <X size={18} weight="bold" />
        </Close>
        <h2 id="phone-gate-title" ref={titleRef} tabIndex={-1}>
          Confirm your phone number
        </h2>
        <p>
          Passengers call this number. Payouts go here. We text a code once.
        </p>
        <PhoneVerifyFlow initialPhone={initialPhone} onCancel={onClose} onVerified={() => onVerified()} />
      </Card>
    </Backdrop>,
    document.body,
  );
}
