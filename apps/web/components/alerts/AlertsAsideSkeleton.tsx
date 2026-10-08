"use client";

import styled from "styled-components";
import { Busy, Shimmer, SkeletonStack, SrOnly } from "@/components/ui/Shimmer";

const Panel = styled.section`
  padding: 18px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.color.outlineVariant};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  & + & {
    margin-top: 16px;
  }
`;

const Heading = styled.h2`
  margin: 0 0 14px;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

export function AlertsAsideSkeleton() {
  return (
    <Busy>
      <SrOnly>Loading trending roads</SrOnly>
      <Panel>
        <Heading>Trending roads</Heading>
        <SkeletonStack $gap="12px">
          {[68, 82, 74, 60].map((w, i) => (
            <Shimmer key={i} $w={`${w}%`} $h="16px" />
          ))}
        </SkeletonStack>
      </Panel>
      <Panel>
        <Heading>Common questions</Heading>
        <SkeletonStack $gap="12px">
          {[90, 76, 84].map((w, i) => (
            <Shimmer key={i} $w={`${w}%`} $h="16px" />
          ))}
        </SkeletonStack>
      </Panel>
    </Busy>
  );
}
