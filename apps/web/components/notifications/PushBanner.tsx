"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { BellRing, X } from "lucide-react";

const DISMISS_KEY = "kipita-push-banner-dismissed";

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.tone.green.bg};
  color: ${({ theme }) => theme.tone.green.on};

  .copy {
    flex: 1;
    min-width: 0;
  }
  b {
    display: block;
    font-size: 0.92rem;
    font-weight: 800;
  }
  p {
    margin: 2px 0 0;
    font-size: 0.83rem;
    line-height: 1.4;
    opacity: 0.82;
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

const Enable = styled.button`
  flex: none;
  height: 38px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font-weight: 800;
  font-size: 0.86rem;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.primaryDark};
  }
`;

const Dismiss = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
`;

/**
 * Asks once for browser-notification permission, so an incoming ride surfaces
 * outside the tab too. Only shown while the decision is still open — granted,
 * denied and unsupported all render nothing.
 */
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

  if (permission !== "default" || dismissed) return null;

  async function enable() {
    try {
      setPermission(await Notification.requestPermission());
    } catch {
      setPermission("denied");
    }
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  return (
    <Banner>
      <Lead>
        <BellRing size={19} strokeWidth={2.4} />
      </Lead>
      <div className="copy">
        <b>Get alerted the moment a ride appears</b>
        <p>Allow browser notifications and we&apos;ll tell you about new rides on your routes.</p>
      </div>
      <Enable type="button" onClick={enable}>
        Allow
      </Enable>
      <Dismiss type="button" onClick={dismiss} aria-label="Dismiss">
        <X size={16} strokeWidth={2.4} />
      </Dismiss>
    </Banner>
  );
}
