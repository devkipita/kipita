"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { BellRinging as BellRing, X } from "@/components/icons";
import { Collapse } from "@/components/anim/Collapse";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { chime, setSound, unlockSound } from "@/lib/notifications/ping";

const DISMISS_KEY = "kipita-push-banner-dismissed";

const Banner = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 14px;
  padding: 12px 12px 12px 16px;
  margin-bottom: 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.tone.green.bg};
  color: ${({ theme }) => theme.tone.green.on};

  .copy {
    flex: 1 1 180px;
    min-width: 0;
  }
  b {
    display: block;
    font-size: 0.95rem;
    font-weight: 800;
  }
  span.sub {
    display: block;
    margin-top: 2px;
    font-size: 0.85rem;
    line-height: 1.4;
  }
`;

const Lead = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex: none;
  background: currentColor;

  svg {
    color: ${({ theme }) => theme.tone.green.bg};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
`;

const Enable = styled.button`
  flex: none;
  min-height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform ${dur.press} ${ease.standard};

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

const Dismiss = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background ${dur.state} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: color-mix(in oklab, currentColor 12%, transparent);
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

export function PushBanner() {
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported" | null
  >(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setPermission(
      typeof Notification === "undefined" ? "unsupported" : Notification.permission,
    );
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const open = permission === "default" && !dismissed;

  async function enable() {
    unlockSound();
    try {
      const answer = await Notification.requestPermission();
      setPermission(answer);
      if (answer === "granted") {
        setSound(true);
        chime(true);
      }
    } catch {
      setPermission("denied");
    }
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      return;
    }
  }

  if (permission === "unsupported") return null;

  return (
    <Collapse open={open}>
      <Banner role="region" aria-label="Browser alerts">
        <Lead>
          <BellRing size={19} />
        </Lead>
        <div className="copy">
          <b>Hear new requests and road alerts</b>
          <span className="sub">A chime and a browser alert while Kipita is open.</span>
        </div>
        <Actions>
          <Enable type="button" onClick={enable}>
            Allow alerts
          </Enable>
          <Dismiss type="button" onClick={dismiss} aria-label="Hide the alert prompt">
            <X size={18} />
          </Dismiss>
        </Actions>
      </Banner>
    </Collapse>
  );
}
