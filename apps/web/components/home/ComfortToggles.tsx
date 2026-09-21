"use client";

import styled from "styled-components";
import { Briefcase, Music, PawPrint, VolumeX, type LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import type { RidePreferences } from "@/lib/ride-detail";

const List = styled.div`
  display: grid;
  gap: 2px;
  padding: 6px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface2};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;

  svg {
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
  span {
    flex: 1;
    min-width: 0;
    font-size: 0.92rem;
    font-weight: 600;
    color: ${({ theme }) => theme.color.text};
  }
`;

const OPTIONS: { key: keyof RidePreferences; label: string; icon: LucideIcon }[] = [
  { key: "luggage", label: "Luggage", icon: Briefcase },
  { key: "pets", label: "Pets", icon: PawPrint },
  { key: "silent_ride", label: "Quiet ride", icon: VolumeX },
  { key: "music", label: "Music", icon: Music },
];

/** The four ride preferences, shared by the planner and the post drawer. */
export function ComfortToggles({
  value,
  onChange,
}: {
  value: RidePreferences;
  onChange: (next: RidePreferences) => void;
}) {
  return (
    <List>
      {OPTIONS.map(({ key, label, icon: Icon }) => (
        <Row key={key}>
          <Icon size={18} strokeWidth={2.2} />
          <span>{label}</span>
          <Switch
            checked={!!value[key]}
            onChange={(next) => onChange({ ...value, [key]: next })}
            label={label}
          />
        </Row>
      ))}
    </List>
  );
}
