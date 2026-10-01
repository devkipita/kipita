"use client";

import styled from "styled-components";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { activePreferences } from "@/lib/home/preferences";
import type { ToneName } from "@/lib/theme";
import type { RidePreferences } from "@/lib/ride-detail";

const Row = styled.ul`
  display: contents;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Chip = styled.li<{ $tone: ToneName }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 1 auto;
  min-width: 0;
  padding: 3px 10px 3px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $tone }) => theme.tone[$tone].bg};
  color: ${({ theme, $tone }) => theme.tone[$tone].on};
  font-size: ${({ theme }) => theme.type.micro};
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  svg {
    flex: none;
  }
`;

const More = styled.li`
  display: inline-flex;
  align-items: center;
  flex: none;
  padding: 3px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.elevatedInset};
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  font-size: ${({ theme }) => theme.type.micro};
  font-weight: 600;
  white-space: nowrap;
`;

export function RideAmenities({
  preferences,
  max,
}: {
  preferences: RidePreferences;
  max?: number;
}) {
  const active = activePreferences(preferences);
  if (active.length === 0) return null;

  const shown = max ? active.slice(0, max) : active;
  const rest = active.slice(shown.length);

  return (
    <Row role="list">
      {shown.map(({ key, label, icon: Icon, kind, tone }) => (
        <Chip key={key} role="listitem" $tone={tone} title={label}>
          <Icon size={12} weight={kind === "rule" ? "bold" : "regular"} />
          {label}
          <VisuallyHidden>{kind === "rule" ? " rule" : ""}</VisuallyHidden>
        </Chip>
      ))}
      {rest.length > 0 && (
        <More role="listitem" title={rest.map((a) => a.label).join(", ")}>
          +{rest.length}
        </More>
      )}
    </Row>
  );
}
