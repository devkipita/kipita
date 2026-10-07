"use client";

import styled from "styled-components";
import { cityGradient, cityInitial } from "@/lib/places/photo";
import type { PlaceCard } from "@/lib/places";

const Box = styled.span<{ $size: number; $from: string; $to: string }>`
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, ${({ $from }) => $from}, ${({ $to }) => $to});
  color: rgba(255, 255, 255, 0.9);
  font-weight: 800;
  font-size: ${({ $size }) => Math.round($size * 0.42)}px;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

/** Small square town picture, falling back to a coloured monogram. */
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
  const [from, to] = cityGradient(town);
  return (
    <Box $size={size} $from={from} $to={to} aria-hidden="true">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" loading="lazy" />
      ) : (
        cityInitial(town)
      )}
    </Box>
  );
}
