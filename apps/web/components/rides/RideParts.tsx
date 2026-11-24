"use client";

import styled from "styled-components";
import { CarProfile } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";

export type StatusTone = "live" | "wait" | "off";

export const StatusBadge = styled.span<{ $tone: StatusTone }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 4px 12px 4px 8px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  ${({ $tone }) =>
    $tone === "live"
      ? `background: color-mix(in oklab, ${nocturne.lime} 55%, ${nocturne.surface}); color: ${nocturne.greenDeep};`
      : $tone === "wait"
        ? `background: color-mix(in oklab, ${nocturne.star} 18%, ${nocturne.surface}); color: ${nocturne.cream};`
        : `background: ${nocturne.surface3}; color: ${nocturne.muted};`}

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $tone }) => ($tone === "live" ? nocturne.green : $tone === "wait" ? nocturne.star : nocturne.muted2)};
  }
`;

export const RouteHead = styled.header`
  view-transition-name: morph-hero;
  margin-top: 16px;

  h1 {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 16px;
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(30px, 4.4vw, 42px);
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.035em;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  .to {
    display: inline-flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }
  .leg {
    position: relative;
    flex: none;
    width: 46px;
    height: 2px;
    background: repeating-linear-gradient(90deg, ${nocturne.accent} 0 6px, transparent 6px 11px);

    &::before,
    &::after {
      content: "";
      position: absolute;
      top: 50%;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      transform: translateY(-50%);
    }
    &::before {
      left: -4px;
      background: ${nocturne.surface};
      box-shadow: inset 0 0 0 2.5px ${nocturne.accent};
    }
    &::after {
      right: -4px;
      background: ${nocturne.accent};
    }
  }
  p {
    margin: 12px 0 0;
    font-size: 16px;
    line-height: 1.5;
    color: ${nocturne.muted};
  }
`;

export const MetaRow = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 38px;
    padding: 0 16px;
    border-radius: 12px;
    background: ${nocturne.surface};
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

export const Plate = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 8px;
  background: ${nocturne.surface2};
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: ${nocturne.cream};
`;

const CarCard = styled.section`
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: 20px;
  background: ${({ theme }) => theme.tone.blue.bg};
  color: ${({ theme }) => theme.tone.blue.on};

  h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    color: inherit;
  }
`;

const Vehicle = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 16px;

  > svg {
    flex: none;
    align-self: center;
    color: inherit;
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(19px, 2vw, 23px);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: inherit;
  }
  span.colour {
    font-size: 16px;
    color: inherit;
  }
`;

export function CarTile({ name, colour, plate, label = "Car" }: { name: string; colour?: string | null; plate?: string | null; label?: string }) {
  return (
    <CarCard aria-label={label}>
      <h2>{label}</h2>
      <Vehicle>
        <CarProfile size={24} aria-hidden />
        <b>{name}</b>
        {colour && <span className="colour">{colour}</span>}
        {plate && <Plate>{plate.toUpperCase()}</Plate>}
      </Vehicle>
    </CarCard>
  );
}
