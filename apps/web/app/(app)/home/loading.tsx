"use client";

import styled, { keyframes } from "styled-components";
import { nocturne } from "@/lib/nocturne";

const shimmer = keyframes`
  0%   { background-position: -340px 0; }
  100% { background-position: 340px 0; }
`;

const Page = styled.div`
  min-height: 100vh;
  padding: 56px max(34px, calc((100% - 1212px) / 2)) 120px;
  background: ${nocturne.bg};

  @media (max-width: 640px) {
    padding: 28px 18px 90px;
  }
`;

const Bone = styled.div<{ $h: number; $w?: string; $r?: number }>`
  height: ${({ $h }) => $h}px;
  width: ${({ $w }) => $w ?? "100%"};
  border-radius: ${({ $r }) => $r ?? 10}px;
  background: linear-gradient(
    90deg,
    ${nocturne.surface2} 0px,
    ${nocturne.line2} 170px,
    ${nocturne.surface2} 340px
  );
  background-size: 680px 100%;
  animation: ${shimmer} 1.15s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Head = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
`;

const SearchCard = styled.div`
  display: grid;
  grid-template-columns: 1.15fr 1.15fr 0.95fr 0.95fr auto;
  gap: 7px;
  margin-bottom: 28px;
  padding: 9px;
  border-radius: 24px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};

  @media (max-width: 1100px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 215px 1fr;
  gap: 32px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const Filters = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 960px) {
    display: none;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 13px;
`;

const CardRow = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 1.15fr 0.8fr;
  align-items: center;
  gap: 25px;
  padding: 26px;
  border-radius: 20px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.cardBorder};

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 22px 18px;
  }
`;

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
`;

const DriverCol = styled.div`
  display: grid;
  grid-template-columns: 46px 1fr;
  align-items: center;
  gap: 11px;
`;

const PriceCol = styled(Col)`
  align-items: flex-end;
`;

/** Mirrors the real find-a-ride layout so nothing jumps when data lands. */
export default function HomeLoading() {
  return (
    <Page aria-busy="true" aria-label="Loading rides">
      <Head>
        <Bone $h={16} $w="120px" $r={999} />
        <Bone $h={54} $w="min(520px, 80%)" />
        <Bone $h={20} $w="220px" />
      </Head>

      <SearchCard>
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} $h={68} $r={14} />
        ))}
        <Bone $h={68} $w="150px" $r={14} />
      </SearchCard>

      <Layout>
        <Filters>
          <Bone $h={20} $w="140px" />
          <Bone $h={16} $w="100%" />
          <Bone $h={16} $w="86%" />
          <Bone $h={16} $w="74%" />
          <Bone $h={20} $w="120px" />
          <Bone $h={16} $w="92%" />
          <Bone $h={16} $w="80%" />
        </Filters>

        <div>
          <Bone $h={20} $w="180px" />
          <List style={{ marginTop: 20 }}>
            {[0, 1, 2, 3].map((i) => (
              <CardRow key={i}>
                <Col>
                  <Bone $h={18} $w="70%" />
                  <Bone $h={14} $w="45%" />
                  <Bone $h={18} $w="60%" />
                </Col>
                <DriverCol>
                  <Bone $h={46} $w="46px" $r={999} />
                  <Col>
                    <Bone $h={16} $w="80%" />
                    <Bone $h={13} $w="55%" />
                  </Col>
                </DriverCol>
                <PriceCol>
                  <Bone $h={22} $w="90px" />
                  <Bone $h={13} $w="70px" />
                  <Bone $h={42} $w="120px" $r={999} />
                </PriceCol>
              </CardRow>
            ))}
          </List>
        </div>
      </Layout>
    </Page>
  );
}
