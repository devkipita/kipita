"use client";

import { useEffect, useId, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { ArrowRight, X } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { CarArt, DayArt, IdArt, OtherArt, TimeArt, TownsArt } from "./PublishArt";

export type BlockKind = "time" | "day" | "towns" | "car" | "price" | "carType" | "seats" | "kyc" | "phone" | "other";

export type Block = { kind: BlockKind; text: string };

export function blockOf(text: string, fix?: "kyc" | "phone"): Block {
  if (fix === "kyc") return { kind: "kyc", text };
  if (fix === "phone") return { kind: "phone", text };
  if (/already passed/i.test(text)) return { kind: "time", text };
  if (/different towns/i.test(text)) return { kind: "towns", text };
  if (/too low|too high/i.test(text)) return { kind: "price", text };
  if (/carries up to|more people than the car can carry/i.test(text)) return { kind: "seats", text };
  return { kind: "other", text };
}

const COPY: Record<BlockKind, { title: string; action: string }> = {
  time: { title: "That departure time has passed", action: "Pick a new time" },
  day: { title: "That day is already behind us", action: "Pick a new day" },
  towns: { title: "Start and finish are the same town", action: "Change the route" },
  car: { title: "Your car needs a few details", action: "Finish the car" },
  price: { title: "That price is outside the range", action: "Change the price" },
  carType: { title: "The car type doesn’t match your car", action: "Change the car type" },
  seats: { title: "Your car can’t carry that many", action: "Change the seats" },
  kyc: { title: "Verify before you publish", action: "Verify to publish" },
  phone: { title: "Confirm your phone number", action: "Confirm number" },
  other: { title: "We couldn't publish your ride", action: "Try again" },
};

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: none; }
`;

const Scrim = styled.div`
  position: fixed;
  z-index: 90;
  inset: 0;
  padding: 16px;
  display: grid;
  place-items: center;
  background: color-mix(in oklab, ${nocturne.greenDeep} 55%, transparent);
  animation: ${fade} 0.2s ${EASE};

  @media (max-width: 600px) {
    padding: 0;
    place-items: end stretch;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Sheet = styled.div`
  position: relative;
  width: min(420px, 100%);
  padding: 32px 28px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 16px;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.panelShadow};
  text-align: center;
  animation: ${rise} 0.32s ${EASE};

  h2 {
    margin: 14px 0 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.2;
    text-wrap: balance;
    color: ${nocturne.cream};
  }
  p {
    max-width: 34ch;
    margin: 8px 0 0;
    color: ${nocturne.muted};
    font-size: 15.5px;
    line-height: 1.55;
  }

  @media (max-width: 600px) {
    width: 100%;
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
    border-radius: 16px 16px 0 0;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Close = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: ${nocturne.muted};
  background: transparent;
  cursor: pointer;

  &:hover {
    background: ${nocturne.surface3};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const ArtSlot = styled.div`
  width: 180px;
  max-width: 60%;
`;

const Actions = styled.div`
  width: 100%;
  margin-top: 24px;
  display: grid;
  gap: 4px;
`;

const Primary = styled.button`
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  color: ${nocturne.ctaFg};
  background: ${nocturne.ctaBg};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ${EASE};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const Secondary = styled.button`
  min-height: 48px;
  border: 0;
  border-radius: 999px;
  color: ${nocturne.muted};
  background: transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${nocturne.cream};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

function Art({ kind }: { kind: BlockKind }) {
  switch (kind) {
    case "time":
      return <TimeArt />;
    case "day":
      return <DayArt />;
    case "towns":
      return <TownsArt />;
    case "car":
    case "carType":
    case "seats":
      return <CarArt />;
    case "kyc":
    case "phone":
      return <IdArt state="none" />;
    default:
      return <OtherArt />;
  }
}

export function PublishBlocker({
  block,
  onFix,
  onClose,
  busy,
}: {
  block: Block;
  onFix: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const titleId = useId();
  const bodyId = useId();
  const primary = useRef<HTMLButtonElement>(null);
  const copy = COPY[block.kind];

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <Scrim onClick={onClose}>
      <Sheet role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} onClick={(e) => e.stopPropagation()}>
        <Close type="button" aria-label="Close" onClick={onClose}>
          <X size={18} weight="bold" />
        </Close>
        <ArtSlot>
          <Art kind={block.kind} />
        </ArtSlot>
        <h2 id={titleId}>{copy.title}</h2>
        <p id={bodyId}>{block.text}</p>
        <Actions>
          <Primary ref={primary} type="button" onClick={onFix} disabled={busy} aria-busy={busy}>
            {copy.action}
            <ArrowRight size={18} weight="bold" />
          </Primary>
          <Secondary type="button" onClick={onClose}>
            Not now
          </Secondary>
        </Actions>
      </Sheet>
    </Scrim>
  );
}
