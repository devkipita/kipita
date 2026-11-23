"use client";

import styled from "styled-components";
import { AlertCardSkeleton } from "@/components/alerts/AlertCardSkeleton";
import { Busy, Shimmer, SrOnly } from "@/components/ui/Shimmer";
import { ALERT_TABS } from "@/lib/alerts/status";
import { nocturne } from "@/lib/nocturne";

const Tabs = styled.div`
  display: flex;
  overflow: hidden;
  border-bottom: 1px solid ${nocturne.line};
`;

const Tab = styled.span<{ $active: boolean }>`
  position: relative;
  flex: 1 0 auto;
  display: grid;
  place-items: center;
  min-height: 48px;
  padding: 0 16px;
  font-size: 14px;
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

const Composer = styled.div`
  display: grid;
  gap: 12px;
  padding: 16px 12px 12px;
  border-bottom: 1px solid ${nocturne.line};

  .top {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 52px;
  }
  .push {
    margin-left: auto;
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 0 12px;

  h1 {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: ${nocturne.cream};
  }
`;

const Feed = styled.div`
  display: grid;
  gap: 12px;
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
      <Composer aria-hidden>
        <div className="top">
          <Shimmer $w="40px" $h="40px" $r="999px" />
          <Shimmer $w="60%" $h="28px" $r="8px" />
        </div>
        <div className="foot">
          <Shimmer $w="96px" $h="32px" $r="8px" />
          <Shimmer $w="112px" $h="32px" $r="8px" />
          <span className="push">
            <Shimmer $w="112px" $h="40px" $r="999px" />
          </span>
        </div>
      </Composer>
      <Toolbar aria-hidden>
        <div>
          <h1>Road alerts</h1>
          <Shimmer $w="72px" $h="12px" $r="4px" />
        </div>
        <Shimmer $w="104px" $h="32px" $r="8px" />
      </Toolbar>
      <Feed aria-hidden>
        <AlertCardSkeleton />
        <AlertCardSkeleton />
        <AlertCardSkeleton />
      </Feed>
    </Busy>
  );
}
