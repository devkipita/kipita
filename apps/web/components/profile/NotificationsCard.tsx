"use client";

import { useEffect, useState } from "react";
import { Bell, Megaphone, Path as Route } from "@/components/icons";
import { Switch } from "@/components/ui/Switch";
import { ControlRow, Panel } from "./SettingsUI";

const KEY = "kipita-notif-prefs";
type Prefs = { trips: boolean; promos: boolean };
const DEFAULTS: Prefs = { trips: true, promos: false };

/** Local notification preferences + a real browser-push permission toggle. */
export function NotificationsCard() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [push, setPush] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
    setPush(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  function save(next: Prefs) {
    setPrefs(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }

  async function togglePush(on: boolean) {
    if (push === "unsupported") return;
    if (on && push !== "granted") {
      const res = await Notification.requestPermission();
      setPush(res);
    } else if (!on) {
      // Browsers can't revoke programmatically — point the user to settings.
      setPush(Notification.permission);
    }
  }

  return (
    <Panel>
      <ControlRow
        icon={Bell}
        tone="amber"
        title="Push notifications"
        description={
          push === "unsupported"
            ? "Not supported on this device"
            : push === "granted"
              ? "On — you'll get ride alerts here"
              : push === "denied"
                ? "Blocked in your browser settings"
                : "Get instant ride alerts"
        }
      >
        <Switch
          checked={push === "granted"}
          onChange={togglePush}
          label="Push notifications"
        />
      </ControlRow>
      <ControlRow
        icon={Route}
        tone="green"
        title="Trip updates"
        description="Bookings, confirmations, and reminders"
      >
        <Switch checked={prefs.trips} onChange={(v) => save({ ...prefs, trips: v })} label="Trip updates" />
      </ControlRow>
      <ControlRow
        icon={Megaphone}
        tone="tan"
        title="Offers & news"
        description="Occasional promos — no spam"
        last
      >
        <Switch checked={prefs.promos} onChange={(v) => save({ ...prefs, promos: v })} label="Offers and news" />
      </ControlRow>
    </Panel>
  );
}
