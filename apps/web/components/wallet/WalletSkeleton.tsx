"use client";

import styled from "styled-components";
import { Busy, Shimmer, SkeletonCard, SrOnly } from "@/components/ui/Shimmer";
import { ContentWidth } from "@/components/nav/AppShell";

const Page = styled(ContentWidth)`
  padding-block: 20px 56px;
  display: grid;
  gap: 28px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2.3rem, 6vw, 3.4rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.042em;
  color: ${({ theme }) => theme.color.onSurface};
`;

const Band = styled.div`
  display: grid;
  gap: 12px;

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr);
    align-items: stretch;
  }
`;

const Stack = styled.div`
  display: grid;
  gap: 12px;
`;

const Balance = styled.div`
  container-type: inline-size;
  display: grid;
  gap: 24px;
  align-content: space-between;
  min-height: 320px;
  padding: 28px;
  border-radius: 28px;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};

  .cap {
    height: 22px;
    margin-bottom: 12px;
  }
  .value {
    font-size: clamp(2.2rem, 13cqi, 4.2rem);
    height: 1.3em;
    width: 6.5em;
    max-width: 100%;
  }
  .actions {
    display: flex;
    gap: 10px;
  }

  @media (min-width: 720px) {
    padding: 32px 34px;
  }
`;

const Tile = styled.div`
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 20px;
  border-radius: 24px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};
`;

const Heading = styled.h2`
  margin: 0;
  font-size: clamp(1.7rem, 3.4vw, 2.3rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: ${({ theme }) => theme.color.onSurface};
`;

const Ledger = styled.div`
  display: grid;
  gap: 8px;
`;

export function WalletSkeleton() {
  return (
    <Busy>
      <Page>
        <SrOnly>Loading your wallet</SrOnly>
        <Title data-bar-title="">Wallet</Title>
        <Band aria-hidden>
          <Balance>
            <div>
              <Shimmer className="cap" $w="150px" $h="22px" />
              <Shimmer className="value" $r="12px" />
            </div>
            <div className="actions">
              <Shimmer $w="118px" $h="48px" $r="999px" />
              <Shimmer $w="132px" $h="48px" $r="999px" />
            </div>
          </Balance>
          <Stack>
            {[0, 1, 2].map((i) => (
              <Tile key={i}>
                <Shimmer $w="130px" $h="16px" />
                <Shimmer $w="150px" $h="28px" $r="8px" />
                <Shimmer $w="60%" $h="12px" />
              </Tile>
            ))}
          </Stack>
        </Band>
        <Heading>Activity</Heading>
        <Ledger aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} $h="78px" />
          ))}
        </Ledger>
      </Page>
    </Busy>
  );
}
