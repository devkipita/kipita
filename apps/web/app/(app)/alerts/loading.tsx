"use client";

import styled from "styled-components";
import {
  Busy,
  Shimmer,
  SkeletonCard,
  SkeletonStack,
  SrOnly,
} from "@/components/ui/Shimmer";
import { ALERT_TABS } from "@/lib/alerts/status";
import { nocturne } from "@/lib/nocturne";

const Tabs = styled.div`
  display: flex;
  overflow: hidden;
  border-bottom: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
`;

const Tab = styled.span<{ $active: boolean }>`
  position: relative;
  flex: 1 0 auto;
  display: grid;
  place-items: center;
  min-height: 48px;
  padding: 0 18px;
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  white-space: nowrap;
  color: ${({ $active }) => ($active ? nocturne.cream : nocturne.muted)};

  &::after {
    content: "";
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 0;
    height: 3px;
    border-radius: 3px;
    background: ${({ $active }) => ($active ? nocturne.accent : "transparent")};
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 2px 10px;

  h1 {
    margin: 0 0 6px;
    font-size: 1.28rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: ${({ theme }) => theme.color.text};
  }
`;

export default function Loading() {
  return (
    <Busy>
      <SrOnly>Loading road alerts</SrOnly>
      <Tabs aria-hidden>
        {ALERT_TABS.map((t) => (
          <Tab key={t.key} $active={t.key === "all"}>
            {t.label}
          </Tab>
        ))}
      </Tabs>
      <Toolbar aria-hidden>
        <div>
          <h1>Road alerts</h1>
          <Shimmer $w="72px" $h="12px" />
        </div>
        <Shimmer $w="112px" $h="44px" $r="999px" />
      </Toolbar>
      <SkeletonStack $gap="12px" aria-hidden>
        <SkeletonCard $h="176px" />
        <SkeletonCard $h="290px" />
        <SkeletonCard $h="176px" />
      </SkeletonStack>
    </Busy>
  );
}
