"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";

const ASKED_KEY = "kipita-location-asked";

function alreadyAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

function markAsked(): void {
  try {
    localStorage.setItem(ASKED_KEY, "1");
  } catch {
    return;
  }
}

/**
 * Asks a driver once, right after sign-in, to allow location, so the browser's own prompt never
 * lands in the middle of a ride. The sheet explains it first; the browser prompt only opens when the
 * driver taps Allow. It stays quiet if the browser already has an answer, if it was asked before on
 * this device, or while another sheet (phone check, driver form) is open.
 */
export function LocationAsk({ enabled, blocked }: { enabled: boolean; blocked: boolean }) {
  const [due, setDue] = useState(false);

  useEffect(() => {
    if (!enabled || !("geolocation" in navigator) || alreadyAsked()) return;
    let live = true;
    const show = () => {
      if (live) setDue(true);
    };
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          if (status.state === "prompt") show();
        })
        .catch(show);
    } else {
      show();
    }
    return () => {
      live = false;
    };
  }, [enabled]);

  const close = useCallback(() => {
    markAsked();
    setDue(false);
  }, []);

  const allow = useCallback(() => {
    close();
    navigator.geolocation.getCurrentPosition(
      () => undefined,
      () => undefined,
      { timeout: 15000, maximumAge: 60000 },
    );
  }, [close]);

  return (
    <ConfirmSheet
      open={due && !blocked}
      title="Turn on location"
      lead="Passengers see your car on the map during a ride. We share it only while a ride is under way."
      yes="Allow location"
      no="Not now"
      onClose={close}
      onConfirm={allow}
    />
  );
}
