"use client";

import styled from "styled-components";
import { ALERT_META } from "@/lib/alerts/meta";
import type { AlertCategory } from "@/lib/alerts/types";
import type { AccentName, AccentStep } from "@/lib/theme";

const Pill = styled.span<{ $accent: AccentName; $step: AccentStep }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;

  background: ${({ theme, $accent, $step }) => theme.accent[$accent][$step].bg};
  color: ${({ theme, $accent, $step }) => theme.accent[$accent][$step].on};

  /* Filled glyphs knock their inner marks out against the surface behind. */
  --icon-knockout: ${({ theme, $accent, $step }) => theme.accent[$accent][$step].bg};

  svg {
    flex: none;
  }
`;

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
    <Pill $accent={meta.accent} $step={solid ? "bold" : meta.step}>
      <Icon size={13} weight="fill" />
      {meta.label}
    </Pill>
  );
}
