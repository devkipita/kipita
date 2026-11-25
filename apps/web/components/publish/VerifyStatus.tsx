"use client";

import type { ReactNode } from "react";
import styled, { css } from "styled-components";
import { ArrowRight, Check } from "@/components/icons";
import { nocturne, pulse } from "@/lib/nocturne";
import { IdArt } from "./PublishArt";

export type VerifyStage = "none" | "pending" | "rejected" | "live";

const Card = styled.section<{ $stage: VerifyStage; $compact?: boolean }>`
  padding: ${({ $compact }) => ($compact ? "20px" : "24px 28px")};
  display: grid;
  grid-template-columns: ${({ $compact }) => ($compact ? "1fr" : "150px minmax(0, 1fr)")};
  gap: ${({ $compact }) => ($compact ? "8px" : "26px")};
  align-items: center;
  border-radius: 16px;

  ${({ $stage }) =>
    $stage === "pending"
      ? css`
          color: ${nocturne.onGreen};
          background: ${nocturne.green};
        `
      : $stage === "rejected"
        ? css`
            color: ${nocturne.cream};
            background: ${nocturne.surface3};
          `
        : css`
            color: ${nocturne.cream};
            background: ${nocturne.surface2};
          `}

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 20px;
  }
`;

const ArtSlot = styled.div<{ $compact?: boolean }>`
  width: 100%;
  max-width: ${({ $compact }) => ($compact ? "128px" : "150px")};

  @media (max-width: 640px) {
    max-width: 128px;
  }
`;

const Body = styled.div<{ $stage: VerifyStage }>`
  min-width: 0;

  h3 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(20px, 2vw, 24px);
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.2;
    text-wrap: balance;
    color: inherit;
  }
  p {
    margin: 8px 0 0;
    max-width: 56ch;
    font-size: 15px;
    line-height: 1.55;
    color: ${({ $stage }) => ($stage === "pending" ? nocturne.onGreenMuted : nocturne.muted)};
  }
  p b {
    font-weight: 700;
    color: ${({ $stage }) => ($stage === "rejected" ? nocturne.danger : "inherit")};
  }
`;

const Steps = styled.ol<{ $stage: VerifyStage }>`
  margin: 18px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 0;
  list-style: none;
  font-size: 13.5px;
  font-weight: 700;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  li + li::before {
    content: "";
    width: 28px;
    height: 2px;
    margin: 0 10px;
    border-radius: 2px;
    background: ${({ $stage }) =>
      $stage === "pending" ? nocturne.onGreenMuted : `color-mix(in oklab, ${nocturne.accent} 58%, transparent)`};
  }
  li[data-state="todo"] {
    color: ${({ $stage }) => ($stage === "pending" ? nocturne.onGreenMuted : nocturne.muted2)};
  }

  @media (max-width: 520px) {
    flex-direction: column;
    align-items: flex-start;

    li + li::before {
      display: none;
    }
  }
`;

const Mark = styled.span<{ $stage: VerifyStage; $state: "done" | "now" | "todo" }>`
  position: relative;
  isolation: isolate;
  width: 22px;
  height: 22px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 50%;

  ${({ $stage, $state }) => {
    const onField = $stage === "pending";
    if ($state === "done")
      return css`
        color: ${onField ? nocturne.greenDeep : nocturne.onGreen};
        background: ${onField ? nocturne.lime : nocturne.accent};
      `;
    if ($state === "now")
      return css`
        background: ${onField ? nocturne.lime : nocturne.ctaBg};

        &::after {
          content: "";
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          background: ${onField ? nocturne.lime : nocturne.ctaBg};
          animation: ${pulse} 1.8s ease-in-out infinite;
          z-index: -1;
        }
        @media (prefers-reduced-motion: reduce) {
          &::after {
            animation: none;
            opacity: 0.3;
          }
        }
      `;
    return css`
      border: 2px solid ${onField ? nocturne.onGreenMuted : `color-mix(in oklab, ${nocturne.accent} 58%, transparent)`};
    `;
  }}
`;

const Action = styled.button`
  margin-top: 18px;
  min-height: 48px;
  padding: 0 22px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  color: ${nocturne.onGreen};
  background: ${nocturne.green};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(1px);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

type Copy = { title: string; body: ReactNode; steps: [string, string, string]; at: 0 | 1 | 3 };

function copyFor(stage: VerifyStage, context: "publish" | "ride", liveNow: boolean): Copy {
  if (context === "ride") {
    if (stage === "pending")
      return {
        title: "Saved. Waiting for verification",
        body: "Goes live once you're verified.",
        steps: ["Ride saved", "Documents in review", "Live for passengers"],
        at: 1,
      };
    return {
      title: "Live",
      body: "Passengers can book it.",
      steps: ["Ride saved", "Verified", "Live for passengers"],
      at: 3,
    };
  }
  if (stage === "pending")
    return {
      title: liveNow ? "Your documents are in review" : "Publish now, live once you're verified",
      body: liveNow
        ? "Passengers can book while we check your documents."
        : "Goes live once you're verified.",
      steps: ["Documents sent", "In review", "Live for passengers"],
      at: 1,
    };
  if (stage === "rejected")
    return {
      title: "Send your documents again",
      body: (
        <>
          <b>Your last verification didn't go through.</b> Send clear photos of your ID, licence and car.
        </>
      ),
      steps: ["Resubmit", "Review", "Live for passengers"],
      at: 0,
    };
  return {
    title: "Get verified to go live",
    body: "Verify once: your ID, driving licence and a photo of your car.",
    steps: ["Verify", "Review", "Live for passengers"],
    at: 0,
  };
}

export function VerifyStatusCard({
  stage,
  context = "publish",
  liveNow = false,
  compact,
  action,
  onAction,
}: {
  stage: VerifyStage;
  context?: "publish" | "ride";
  liveNow?: boolean;
  compact?: boolean;
  action?: ReactNode;
  onAction?: () => void;
}) {
  const c = copyFor(stage, context, liveNow);
  return (
    <Card $stage={stage} $compact={compact} aria-live="polite">
      <ArtSlot $compact={compact}>
        <IdArt state={stage} field={stage === "pending"} />
      </ArtSlot>
      <Body $stage={stage}>
        <h3>{c.title}</h3>
        <p>{c.body}</p>
        <Steps $stage={stage} aria-label="Verification progress">
          {c.steps.map((label, i) => {
            const state = c.at === 3 || i < c.at ? "done" : i === c.at ? "now" : "todo";
            return (
              <li key={label} data-state={state} aria-current={state === "now" ? "step" : undefined}>
                <Mark $stage={stage} $state={state}>
                  {state === "done" && <Check size={13} weight="bold" />}
                </Mark>
                {label}
              </li>
            );
          })}
        </Steps>
        {action && onAction && (
          <Action type="button" onClick={onAction}>
            {action}
            <ArrowRight size={17} weight="bold" />
          </Action>
        )}
      </Body>
    </Card>
  );
}
