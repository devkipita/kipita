"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Bell, Check, Prohibit } from "@/components/icons";
import { Switch } from "@/components/ui/Switch";
import { nocturne } from "@/lib/nocturne";
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
  default: "Alerts for new rides while Kipita is open",
  granted: "On while Kipita is open. Turn off in your browser",
  denied: "Blocked in your browser settings",
  unsupported: "This browser can't show alerts",
};

export function NotificationsCard() {
  const [push, setPush] = useState<Permission>(null);

  useEffect(() => {
    setPush(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  async function enable(on: boolean) {
    if (!on || typeof Notification === "undefined") return;
    setPush(await Notification.requestPermission());
  }

  return (
    <Panel>
      <ControlRow
        icon={Bell}
        tone="amber"
        title="Browser alerts"
        description={push ? DESCRIPTION[push] : undefined}
        last
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
    </Panel>
  );
}
