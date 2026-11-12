"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import { ArrowRight, X } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { CarArt, DocumentArt, SelfieArt, VerifiedBadgeIcon } from "./DriverKycForm";

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
  max-width: 520px;
  max-height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
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
`;

const Hero = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 22px 22px;
  background: ${nocturne.greenDeep};
  color: ${nocturne.onGreen};
  text-align: center;

  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.25;
    outline: none;
  }
  p {
    margin: 0;
    max-width: 360px;
    font-size: 15px;
    line-height: 1.5;
    color: ${nocturne.onGreenMuted};
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
  background: rgba(255, 255, 255, 0.1);
  color: ${nocturne.onGreen};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 2px;
  }
`;

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 20px 22px 4px;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 12px;
    border: 1px solid ${nocturne.line};
    border-radius: 16px;
  }
  li svg {
    flex: none;
    width: 96px;
  }
  b {
    display: block;
    font-size: 15px;
    font-weight: 800;
  }
  span {
    font-size: 13px;
    line-height: 1.45;
    color: ${nocturne.muted};
  }
`;

const Foot = styled.div`
  display: flex;
  gap: 10px;
  padding: 18px 22px calc(22px + env(safe-area-inset-bottom));

  button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 52px;
    border-radius: 14px;
    font: inherit;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
  }
  .later {
    border: 1.5px solid ${nocturne.line};
    background: ${nocturne.surface};
    color: ${nocturne.cream};
    font-weight: 700;
  }
  .yes {
    flex: 1.6;
    border: 0;
    background: ${nocturne.green};
    color: ${nocturne.onGreen};
  }
  button:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const STEPS = [
  { art: <DocumentArt />, title: "Your ID or licence", text: "A clear photo and its number." },
  { art: <SelfieArt />, title: "A profile photo", text: "So passengers know who to look for." },
  { art: <CarArt />, title: "Your car", text: "With the number plate showing." },
];

export function DriverInvite({ open, onYes, onLater }: { open: boolean; onYes: () => void; onLater: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onLater();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onLater]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <Backdrop onClick={onLater}>
      <Card role="dialog" aria-modal="true" aria-labelledby="driver-invite-title" onClick={(e) => e.stopPropagation()}>
        <Hero>
          <Close type="button" aria-label="Not now" onClick={onLater}>
            <X size={18} weight="bold" />
          </Close>
          <VerifiedBadgeIcon size={48} onDark />
          <h2 id="driver-invite-title" ref={titleRef} tabIndex={-1}>
            Will you be driving too?
          </h2>
          <p>Get verified as a driver to offer your empty seats and get paid for trips you already make.</p>
        </Hero>
        <Steps aria-label="What you will need">
          {STEPS.map((s) => (
            <li key={s.title}>
              {s.art}
              <div>
                <b>{s.title}</b>
                <span>{s.text}</span>
              </div>
            </li>
          ))}
        </Steps>
        <Foot>
          <button type="button" className="later" onClick={onLater}>
            Not now
          </button>
          <button type="button" className="yes" onClick={onYes}>
            Yes, verify me
            <ArrowRight size={18} weight="bold" />
          </button>
        </Foot>
      </Card>
    </Backdrop>,
    document.body,
  );
}
