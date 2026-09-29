"use client";

import styled, { keyframes } from "styled-components";
import { MapTrifold as MapIcon } from "@/components/icons";

import { HOME_COPY } from "@/lib/home/copy";

const dash = keyframes`
  to { stroke-dashoffset: -60; }
`;

const Wrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: ${({ theme }) => theme.color.bgAlt};
  display: grid;
  place-items: center;
`;

const Art = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;

  .land {
    fill: ${({ theme }) => theme.color.bg};
  }
  .route {
    fill: none;
    stroke: ${({ theme }) => theme.color.primary};
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-dasharray: 6 8;
    opacity: 0.55;
    animation: ${dash} 2.4s linear infinite;
  }
  .glow {
    fill: none;
    stroke: ${({ theme }) => theme.color.primary};
    stroke-width: 5;
    opacity: 0.1;
    stroke-linecap: round;
  }
  .node {
    fill: ${({ theme }) => theme.color.primary};
  }

  @media (prefers-reduced-motion: reduce) {
    .route {
      animation: none;
      stroke-dasharray: none;
    }
  }
`;

const Panel = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.line};

  span {
    font-size: ${({ theme }) => theme.type.label};
    font-weight: 600;
    color: ${({ theme }) => theme.color.text};
  }
  svg {
    color: ${({ theme }) => theme.color.primary};
    flex: none;
  }
`;

const Cta = styled.button`
  border: 0;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.primaryDark};
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const ROUTES = [
  "M 118 44 L 196 96",
  "M 118 44 L 62 82",
  "M 118 44 L 150 24",
  "M 62 82 L 40 52",
];

const NODES: Array<[number, number]> = [
  [118, 44],
  [196, 96],
  [62, 82],
  [150, 24],
  [40, 52],
];

export function MapTeaser({
  label,
  onActivate,
}: {
  label?: string;
  onActivate?: () => void;
}) {
  return (
    <Wrap>
      <Art viewBox="0 0 240 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect className="land" x="0" y="0" width="240" height="120" />
        {ROUTES.map((d) => (
          <path key={`g-${d}`} className="glow" d={d} />
        ))}
        {ROUTES.map((d) => (
          <path key={d} className="route" d={d} />
        ))}
        {NODES.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} className="node" cx={cx} cy={cy} r="3.4" />
        ))}
      </Art>

      <Panel>
        <MapIcon size={18} />
        <span>{label ?? HOME_COPY.mapTeaserTitle}</span>
        {onActivate && (
          <Cta type="button" onClick={onActivate}>
            {HOME_COPY.mapTeaserCta}
          </Cta>
        )}
      </Panel>
    </Wrap>
  );
}
