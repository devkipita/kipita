"use client";

import { useCallback, useEffect } from "react";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { useInstallHelp, wire } from "@/lib/app/install";

/**
 * Registers the offline service worker (public/sw.js), starts listening for the browser's install
 * offer, and holds the iPhone "Add to Home Screen" sheet. Renders nothing otherwise.
 */
export function InstallWatch() {
  const { open, close } = useInstallHelp();

  useEffect(() => {
    wire();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    };
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  const openShare = useCallback(() => {
    close();
    // The Share sheet is where "Add to Home Screen" lives; opening it saves a step.
    if (typeof navigator.share === "function") {
      navigator.share({ title: "Kipita", url: `${window.location.origin}/home` }).catch(() => undefined);
    }
  }, [close]);

  return (
    <ConfirmSheet
      open={open}
      title="Add Kipita to your home screen"
      lead="Tap Share, then Add to Home Screen. Open Kipita from there and sign in once."
      yes="Open Share"
      no="Not now"
      onClose={close}
      onConfirm={openShare}
    />
  );
}
