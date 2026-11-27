"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styled, { css } from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { Z } from "@/lib/z";
import { readConsent, writeConsent, type Consent } from "@/lib/consent";
import { CookiesArt } from "./LegalArt";

const Card = styled.section`
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + var(--bottom-bar-space, 0px) + env(safe-area-inset-bottom));
  z-index: ${Z.consent};
  display: grid;
  overflow: hidden;
  border-radius: 24px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  box-shadow: ${nocturne.panelShadow};
  opacity: 0;
  transform: translateY(24px);
  transition:
    transform ${dur.exit} ${ease.exit},
    opacity ${dur.exit} ${ease.exit};

  &[data-show="true"] {
    opacity: 1;
    transform: none;
    transition:
      transform ${dur.enter} ${ease.enter},
      opacity ${dur.enter} ${ease.enter};
  }

  @media (min-width: 860px) {
    left: 24px;
    right: auto;
    bottom: 24px;
    width: 400px;
  }

  @media (prefers-reduced-motion: reduce) {
    transform: none;

    &[data-show="true"] {
      transform: none;
    }
  }
`;

const Band = styled.div`
  display: grid;
  place-items: center;
  padding: 16px 24px 0;
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  svg {
    width: min(240px, 72%);
    height: auto;
  }

  @media (max-width: 420px) {
    svg {
      width: min(180px, 60%);
    }
  }
`;

const Body = styled.div`
  display: grid;
  gap: 8px;
  padding: 20px 20px 0;

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
    font-weight: 800;
    line-height: 28px;
    letter-spacing: -0.02em;
  }
  p {
    margin: 0;
    font-size: 15px;
    line-height: 22px;
    color: ${nocturne.muted};
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
  }
`;

const TextLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  font-size: 14px;
  font-weight: 700;
  color: ${nocturne.green};
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 4px;
  transition: color ${dur.state} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${nocturne.greenDeep};
    }
  }
  &:active {
    color: ${nocturne.greenDeep};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 16px 20px 20px;
`;

const pill = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const Essential = styled.button`
  ${pill}
  background: ${({ theme }) => theme.tone.surface.bg};
  color: ${({ theme }) => theme.tone.surface.on};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: color-mix(in oklab, ${({ theme }) => theme.tone.surface.bg} 88%, ${nocturne.cream});
    }
  }
`;

const Accept = styled.button`
  ${pill}
  background: ${nocturne.green};
  color: ${nocturne.onGreen};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${nocturne.greenDeep};
    }
  }
`;

export function ConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (readConsent()) return;
    setMounted(true);
    const t = window.setTimeout(() => setShow(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  function choose(choice: Consent) {
    writeConsent(choice);
    setShow(false);
    window.setTimeout(() => setMounted(false), 260);
  }

  if (!mounted) return null;

  return (
    <Card
      data-show={show ? "true" : "false"}
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
    >
      <Band aria-hidden>
        <CookiesArt />
      </Band>
      <Body>
        <h2 id="consent-title">Cookies on Kipita</h2>
        <p id="consent-body">
          We use essential cookies to keep you signed in. With your OK, we also measure performance to make Kipita
          faster.
        </p>
        <div className="links">
          <TextLink href="/legal/privacy">Privacy policy</TextLink>
          <TextLink href="/legal/cookies">Cookie policy</TextLink>
        </div>
      </Body>
      <Actions>
        <Essential type="button" onClick={() => choose("essential")}>
          Essential only
        </Essential>
        <Accept type="button" onClick={() => choose("all")}>
          Accept all
        </Accept>
      </Actions>
    </Card>
  );
}
