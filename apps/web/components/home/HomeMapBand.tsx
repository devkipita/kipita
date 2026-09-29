"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styled from "styled-components";
import { HOME_COPY } from "@/lib/home/copy";
import type { HomeItem } from "@/lib/home/search";
import { MapTeaser } from "./MapTeaser";
import { useMedia } from "./useMedia";

const LiveMap = dynamic(() => import("./LiveMap").then((m) => m.LiveMap), {
  ssr: false,
  loading: () => <MapTeaser />,
});

const Band = styled.section`
  position: relative;
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  height: clamp(200px, 26vh, 320px);
  background: ${({ theme }) => theme.color.bgAlt};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  @media (max-width: 860px) {
    display: none;
  }
`;

export function HomeMapBand({
  items,
  hoveredId,
  onHover,
  fitKey,
}: {
  items: HomeItem[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  fitKey: number;
}) {
  const wide = useMedia("(min-width: 861px)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (mounted && !wide) return null;

  return (
    <Band aria-label={HOME_COPY.mapLabel}>
      {mounted && wide ? (
        <LiveMap
          items={items}
          hoveredId={hoveredId}
          onHover={onHover}
          fitKey={fitKey}
          animate={!reduced}
        />
      ) : (
        <MapTeaser />
      )}
    </Band>
  );
}
