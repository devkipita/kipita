"use client";

import styled from "styled-components";
import { TrendUp } from "@/components/icons";
import { Busy, Shimmer, SrOnly } from "@/components/ui/Shimmer";
import { AsideHeading, AsidePanel, PostingGuide } from "./AlertsAside";

const RoadRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px 16px;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 12px;

  .text {
    display: grid;
    gap: 8px;
  }
`;

export function AlertsAsideSkeleton() {
  return (
    <Busy>
      <SrOnly>Loading what is happening on the roads</SrOnly>
      <AsidePanel aria-hidden>
        <AsideHeading as="div">
          <TrendUp size={20} />
          What&rsquo;s happening on the roads
        </AsideHeading>
        {[64, 52, 72, 48].map((w) => (
          <RoadRow key={w}>
            <span className="text">
              <Shimmer $w={`${w}%`} $h="16px" $r="4px" />
              <Shimmer $w={`${w - 16}%`} $h="12px" $r="4px" />
            </span>
            <Shimmer $w="64px" $h="24px" $r="6px" />
            <span />
          </RoadRow>
        ))}
      </AsidePanel>
      <PostingGuide />
    </Busy>
  );
}
