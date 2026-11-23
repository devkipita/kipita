"use client";

import styled from "styled-components";
import { chipColors, type ChipTone } from "@/components/ui/Chip";
import { ALERT_META, CATEGORY_ROLE } from "@/lib/alerts/meta";
import type { AlertCategory } from "@/lib/alerts/types";

const Badge = styled.span<{ $tone: ChipTone; $solid: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ theme, $tone, $solid }) => chipColors(theme, $tone, $solid).bg};
  --icon-knockout: ${({ theme, $tone, $solid }) => chipColors(theme, $tone, $solid).bg};
  color: ${({ theme, $tone, $solid }) => chipColors(theme, $tone, $solid).ink};
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;

  svg {
    flex: none;
  }
`;

export function categoryTone(category: AlertCategory): ChipTone {
  return CATEGORY_ROLE[category] ?? "secondary";
}

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
    <Badge $tone={categoryTone(category)} $solid={solid}>
      <Icon size={16} weight="fill" aria-hidden />
      {meta.label}
    </Badge>
  );
}
