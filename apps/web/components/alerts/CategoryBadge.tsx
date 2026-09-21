"use client";

import styled from "styled-components";
import { ALERT_META, categoryTint } from "@/lib/alerts/meta";
import type { AlertCategory } from "@/lib/alerts/types";

const Pill = styled.span<{ $color: string; $solid: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  white-space: nowrap;
  background: ${({ $color, $solid }) => ($solid ? $color : categoryTint($color))};
  color: ${({ $color, $solid }) => ($solid ? "#fff" : $color)};

  svg {
    flex: none;
  }
`;

/**
 * Category chip. `solid` is for the media card, where the chip sits on a photo
 * and a tint would be unreadable.
 */
export function CategoryBadge({
  category,
  solid = false,
}: {
  category: AlertCategory;
  solid?: boolean;
}) {
  const meta = ALERT_META[category] ?? ALERT_META.general;
  const Icon = meta.icon;
  return (
    <Pill $color={meta.color} $solid={solid}>
      <Icon size={13} strokeWidth={2.6} />
      {meta.label}
    </Pill>
  );
}
