"use client";

import styled from "styled-components";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { activePreferences } from "@/lib/home/preferences";
import type { RidePreferences } from "@/lib/ride-detail";

const Row = styled.ul`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  svg {
    display: block;
  }
`;

export function RideAmenities({ preferences }: { preferences: RidePreferences }) {
  const active = activePreferences(preferences);
  if (active.length === 0) return null;

  return (
    <Row>
      {active.map(({ key, label, icon: Icon }) => (
        <li key={key} title={label}>
          <Icon size={15} />
          <VisuallyHidden>{label}</VisuallyHidden>
        </li>
      ))}
    </Row>
  );
}
