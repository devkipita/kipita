"use client";

import styled from "styled-components";
import {
  Busy,
  Shimmer,
  SkeletonCard,
  SkeletonStack,
  SrOnly,
} from "@/components/ui/Shimmer";

const Head = styled.header`
  padding: 20px 0 16px;
`;

const Title = styled.h1`
  margin: 0 0 6px;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.text};
`;

const Lead = styled.p`
  margin: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.muted};
`;

const Composer = styled.div`
  height: 72px;
  margin: 18px 0 22px;
  border-radius: 18px;
  border: 1px solid ${({ theme }) => theme.color.outlineVariant};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
`;

export default function Loading() {
  return (
    <Busy>
      <SrOnly>Loading road alerts</SrOnly>
      <Head>
        <Title>Road alerts</Title>
        <Lead>What drivers are reporting right now.</Lead>
      </Head>
      <Composer aria-hidden />
      <SkeletonStack $gap="16px" aria-hidden>
        <SkeletonCard $h="150px" />
        <SkeletonCard $h="132px" />
        <SkeletonCard $h="166px" />
        <Shimmer $w="40%" $h="14px" />
      </SkeletonStack>
    </Busy>
  );
}
