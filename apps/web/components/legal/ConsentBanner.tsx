"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Cookie } from "@/components/icons";
import { Chip } from "@/components/ui/Chip";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { Z } from "@/lib/z";
import { readConsent, writeConsent, type Consent } from "@/lib/consent";

const Card = styled.section`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${Z.consent};
  display: grid;
  gap: 14px;
  padding: 10px max(20px, env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom))
    max(20px, env(safe-area-inset-left));
  border-radius: 24px 24px 0 0;
  background: color-mix(in oklab, ${nocturne.surface} 68%, transparent);
  backdrop-filter: blur(22px) saturate(1.6);
  -webkit-backdrop-filter: blur(22px) saturate(1.6);
  border-top: 1px solid color-mix(in oklab, ${nocturne.onGreen} 80%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, ${nocturne.onGreen} 70%, transparent),
    ${nocturne.panelShadow};

  @supports not (backdrop-filter: blur(1px)) {
    background: ${nocturne.surface};
  }
  color: ${nocturne.cream};
  transform: translateY(100%);
  transition: transform ${dur.exit} ${ease.exit};

  &[data-show="true"] {
    transform: none;
    transition: transform ${dur.enter} ${ease.enter};
  }

  .grip {
    width: 42px;
    height: 4px;
    margin: 0 auto 4px;
    border-radius: 999px;
    background: ${nocturne.outline};
  }

  @media (min-width: 860px) {
    left: 24px;
    right: auto;
    bottom: 24px;
    width: 420px;
    padding: 18px;
    border-radius: 22px;
    border: 1px solid color-mix(in oklab, ${nocturne.onGreen} 80%, transparent);
    transform: translateY(calc(100% + 40px));
    opacity: 0;
    transition:
      transform ${dur.exit} ${ease.exit},
      opacity ${dur.exit} ${ease.exit};

    &[data-show="true"] {
      opacity: 1;
      transition:
        transform ${dur.enter} ${ease.enter},
        opacity ${dur.state} ${ease.standard};
    }

    .grip {
      display: none;
    }
  }
`;

const Head = styled.div`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: start;

  .well {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: ${nocturne.surface2};
    color: ${nocturne.accent};
  }
  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.015em;
  }
  p {
    margin: 4px 0 0;
    font-size: 14px;
    line-height: 1.45;
    color: ${nocturne.muted};
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-top: 8px;
  }
  a {
    font-size: 14px;
    font-weight: 700;
    color: ${nocturne.accent};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const Accept = styled.button`
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition:
    background 160ms ease,
    transform 150ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${nocturne.greenDeep};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Essential = styled(Chip)`
  justify-content: center;
  min-height: 44px;
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
    <Card data-show={show ? "true" : "false"} role="dialog" aria-label="Cookies and your privacy" aria-live="polite">
      <span className="grip" aria-hidden="true" />
      <Head>
        <span className="well" aria-hidden="true">
          <Cookie size={22} />
        </span>
        <div>
          <h2>Cookies and your privacy</h2>
          <p>We use essential cookies to keep you signed in. With your OK we also measure performance to make Kipita faster.</p>
          <div className="links">
            <Link href="/legal/privacy">Privacy policy</Link>
            <Link href="/legal/cookies">Cookie policy</Link>
          </div>
        </div>
      </Head>
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
