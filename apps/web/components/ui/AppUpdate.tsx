"use client";

import { useState } from "react";
import styled from "styled-components";
import { ArrowClockwise, X } from "@/components/icons";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { IconAction } from "@/components/ui/Chip";
import { useAppUpdate } from "@/lib/app/release";
import { TOPBAR_H, TOPBAR_H_SM } from "@/lib/nav/rail";
import { dur, ease, nocturne } from "@/lib/nocturne";

const Card = styled.section`
  position: fixed;
  top: calc(${TOPBAR_H}px + 12px);
  left: 50%;
  z-index: 150;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  width: min(440px, calc(100vw - 24px));
  padding: 16px 8px 16px 16px;
  border-radius: 20px;
  background: ${nocturne.popover};
  box-shadow: ${nocturne.popoverShadow};
  transform: translateX(-50%);
  transition:
    transform ${dur.enter} ${ease.enter},
    opacity ${dur.enter} ${ease.enter};

  @starting-style {
    transform: translate(-50%, -12px);
    opacity: 0;
  }

  @media (max-width: 960px) {
    top: calc(${TOPBAR_H_SM}px + max(8px, env(safe-area-inset-top)));
  }
  @media (prefers-reduced-motion: reduce) {
    @starting-style {
      transform: translateX(-50%);
      opacity: 0;
    }
  }

  .tile {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.primaryContainer};
    color: ${({ theme }) => theme.color.onPrimaryContainer};
  }
  .copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    font-weight: 800;
    line-height: 24px;
    letter-spacing: -0.01em;
    color: ${nocturne.cream};
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    color: ${nocturne.muted};
  }
  .close {
    margin-top: -4px;
  }
`;

const ReloadButton = styled.button`
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  margin-top: 8px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background-color: ${nocturne.greenDeep};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  &:disabled {
    cursor: progress;
  }
  @media (pointer: coarse) {
    min-height: 44px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

export function AppUpdate() {
  const { release, dismiss } = useAppUpdate();
  const [reloading, setReloading] = useState(false);

  if (!release) return null;

  return (
    <Card role="status" aria-live="polite" aria-labelledby="app-update-title">
      <span className="tile" aria-hidden="true">
        <ArrowClockwise size={24} weight="bold" />
      </span>
      <div className="copy">
        <h2 id="app-update-title">Kipita has a new version</h2>
        <p>Reload to start using it. It takes a second.</p>
        <ReloadButton
          type="button"
          disabled={reloading}
          aria-busy={reloading}
          onClick={() => {
            setReloading(true);
            window.location.reload();
          }}
        >
          {reloading ? (
            <>
              <ButtonOrb job="committing" /> Reloading Kipita
            </>
          ) : (
            "Reload Kipita"
          )}
        </ReloadButton>
      </div>
      <IconAction
        className="close"
        type="button"
        aria-label="Hide update notice"
        title="Hide update notice"
        onClick={dismiss}
      >
        <X size={20} aria-hidden />
      </IconAction>
    </Card>
  );
}
