"use client";

import styled from "styled-components";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { WEATHER_ICON, WEATHER_ROLE, formatTemp } from "@/lib/places/meta";
import type { AppColors } from "@/lib/theme";
import { usePlaces } from "./usePlaces";

const Chip = styled.span<{ $role: keyof AppColors }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  flex: none;
  color: ${({ theme }) => theme.color.onSurface};

  svg {
    flex: none;
    color: ${({ theme, $role }) => theme.color[$role]};
  }
  .temp {
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: ${({ theme }) => theme.type.heading};
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .town {
    font-size: ${({ theme }) => theme.type.label};
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

export function LocalWeather({ town }: { town: string }) {
  const places = usePlaces(town ? [town] : []);
  const card = town ? places.get(town.trim().toLowerCase()) : undefined;
  const weather = card?.weather;

  if (!weather) return null;
  const Icon = WEATHER_ICON[weather.kind];

  return (
    <Chip $role={WEATHER_ROLE[weather.kind]} title={`${weather.label} in ${town}`}>
      <Icon size={30} />
      <span className="temp">{formatTemp(weather.tempC)}</span>
      <span className="town">{town}</span>
      <VisuallyHidden>
        {weather.label} in {town}
      </VisuallyHidden>
    </Chip>
  );
}
