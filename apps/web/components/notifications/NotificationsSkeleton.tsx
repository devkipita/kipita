"use client";

import styled from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import { Busy, Shimmer, SrOnly } from "@/components/ui/Shimmer";
import { nocturne } from "@/lib/nocturne";

export const INBOX_MAX = 760;

const Wrap = styled(ContentWidth)`
  padding-block: 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;

  h1 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
`;

const Bone = styled(Shimmer)`
  background: ${nocturne.line};
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface};

  .body {
    flex: 1;
    display: grid;
    gap: 8px;
  }
`;

const WIDTHS = ["62%", "48%", "70%", "54%", "66%"];

export function NotificationRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Busy>
      <SrOnly>Loading your notifications</SrOnly>
      <Rows aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <Row key={i}>
            <Shimmer $w="40px" $h="40px" $r="50%" />
            <span className="body">
              <Shimmer $w={WIDTHS[i % WIDTHS.length]} $h="15px" />
              <Shimmer $w="86%" $h="13px" />
            </span>
          </Row>
        ))}
      </Rows>
    </Busy>
  );
}

export function NotificationsSkeleton() {
  return (
    <Wrap $max={INBOX_MAX}>
      <Head>
        <h1>Notifications</h1>
        <Bone $w="140px" $h="44px" $r="999px" aria-hidden />
      </Head>
      <Tabs aria-hidden>
        <Bone $w="92px" $h="44px" $r="999px" />
        <Bone $w="104px" $h="44px" $r="999px" />
        <Bone $w="92px" $h="44px" $r="999px" />
      </Tabs>
      <NotificationRowsSkeleton />
    </Wrap>
  );
}
