"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Bell, Check, Prohibit, SpeakerHigh } from "@/components/icons";
import { Switch } from "@/components/ui/Switch";
import { nocturne } from "@/lib/nocturne";
import { chime, setSound, soundOn, unlockSound } from "@/lib/notifications/ping";
import { ControlRow, Panel } from "./SettingsUI";

type Permission = NotificationPermission | "unsupported" | null;

const State = styled.span<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  background: ${({ $on }) => ($on ? nocturne.surface2 : nocturne.surface3)};
  color: ${({ $on }) => ($on ? nocturne.accent : nocturne.muted)};
`;

const DESCRIPTION: Record<NotificationPermission | "unsupported", string> = {
  default: "Requests and road alerts while Kipita is open",
  granted: "On while Kipita is open. Turn off in your browser",
  denied: "Blocked in your browser settings",
  unsupported: "This browser can't show alerts",
};

export function NotificationsCard() {
  const [push, setPush] = useState<Permission>(null);
  const [sound, setSoundState] = useState(true);

  useEffect(() => {
    setPush(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    setSoundState(soundOn());
  }, []);

  async function enable(on: boolean) {
    if (!on || typeof Notification === "undefined") return;
    unlockSound();
    const answer = await Notification.requestPermission();
    setPush(answer);
    if (answer === "granted" && soundOn()) chime(true);
  }

  function toggleSound(on: boolean) {
    setSound(on);
    setSoundState(on);
    if (on) chime(true);
  }

  return (
    <Panel>
      <ControlRow
        icon={Bell}
        tone="amber"
        title="Browser alerts"
        description={push ? DESCRIPTION[push] : undefined}
      >
        {push === "default" && (
          <Switch checked={false} onChange={enable} label="Browser alerts" />
        )}
        {push === "granted" && (
          <State $on>
            <Check size={14} weight="bold" />
            On
          </State>
        )}
        {push === "denied" && (
          <State $on={false}>
            <Prohibit size={14} weight="bold" />
            Blocked
          </State>
        )}
      </ControlRow>
      <ControlRow
        icon={SpeakerHigh}
        tone="green"
        title="Alert sound"
        description="A chime when a request or road alert comes in"
        last
      >
        <Switch checked={sound} onChange={toggleSound} label="Alert sound" />
      </ControlRow>
    </Panel>
  );
}
