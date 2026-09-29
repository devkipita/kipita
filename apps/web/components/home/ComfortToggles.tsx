"use client";

import styled from "styled-components";
import { Briefcase, MusicNote as Music, PawPrint, SpeakerSimpleX as VolumeX } from "@/components/icons";
import type { KipitaIcon as LucideIcon } from "@/components/icons";
import { Switch } from "@/components/ui/Switch";
import type { RidePreferences } from "@/lib/ride-detail";

const List = styled.div`
  display: grid;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 2px;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }

  svg {
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
  span {
    flex: 1;
    min-width: 0;
    font-size: ${({ theme }) => theme.type.body};
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
          <Icon size={18} />
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
