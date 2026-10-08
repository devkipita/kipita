"use client";

import styled from "styled-components";
import Image from "next/image";
import { MapPin } from "@/components/icons";
import type { PlaceCard } from "@/lib/places";

const Box = styled.span<{ $size: number }>`
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 14px;
  overflow: hidden;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  img {
    object-fit: cover;
  }
`;

export function TownThumb({
  town,
  places,
  size = 44,
}: {
  town: string;
  places: Map<string, PlaceCard>;
  size?: number;
}) {
  const photo = places.get(town.trim().toLowerCase())?.photo ?? null;

  return (
    <Box $size={size} aria-hidden="true">
      {photo ? (
        <Image src={photo} alt="" fill sizes={`${size}px`} unoptimized />
      ) : (
        <MapPin size={Math.round(size * 0.46)} weight="regular" />
      )}
    </Box>
  );
}
