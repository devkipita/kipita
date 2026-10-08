"use client";

import {
  Busy,
  SkeletonCard,
  SkeletonStack,
  SrOnly,
} from "@/components/ui/Shimmer";

export default function Loading() {
  return (
    <Busy>
      <SrOnly>Loading alert</SrOnly>
      <SkeletonStack $gap="16px" aria-hidden>
        <SkeletonCard $h="190px" />
        <SkeletonCard $h="96px" />
        <SkeletonCard $h="96px" />
      </SkeletonStack>
    </Busy>
  );
}
