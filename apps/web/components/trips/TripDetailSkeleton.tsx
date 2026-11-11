"use client";

import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";
import { Busy, Shimmer, SrOnly } from "@/components/ui/Shimmer";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

const Wrap = styled.div`
  width: min(1060px, 100%);
  margin: 0 auto;
  padding: 18px var(--page-pad, 20px) 64px;
  background: ${nocturne.bg};
`;

const Stage = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
  align-items: center;
  gap: clamp(20px, 3vw, 40px);
  margin-top: clamp(22px, 3vh, 32px);
  padding: clamp(22px, 3vw, 34px);
  border-radius: 26px;
  background: ${nocturne.surface2};

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Meter = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 18px;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  align-items: start;
  gap: clamp(28px, 4vw, 60px);
  margin-top: clamp(26px, 3.6vh, 38px);

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  padding-bottom: 22px;
`;

const Side = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(22px, 2.6vw, 28px);
  border-radius: 20px;
  background: ${nocturne.surface2};
`;

const Band = styled.div`
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1.5px solid ${RULE};

  &:first-child {
    padding-top: 0;
    margin-top: 0;
    border-top: none;
  }
`;

export function TripDetailSkeleton() {
  return (
    <Busy>
      <Wrap>
        <SrOnly>Loading this trip</SrOnly>

        <Shimmer $w="92px" $h="16px" $mb="22px" aria-hidden />
        <Shimmer $w="min(560px, 80%)" $h="52px" $r="14px" $mb="18px" aria-hidden />
        <Shimmer $w="min(420px, 70%)" $h="18px" aria-hidden />

        <Stage aria-hidden>
          <div>
            <Shimmer $w="128px" $h="14px" $mb="16px" />
            <Shimmer $w="min(380px, 92%)" $h="38px" $r="12px" $mb="14px" />
            <Shimmer $w="100%" $h="14px" $mb="8px" />
            <Shimmer $w="76%" $h="14px" />
            <Meter>
              {[0, 1, 2, 3, 4].map((i) => (
                <Shimmer key={i} $h="7px" $r="999px" />
              ))}
            </Meter>
            <Shimmer $w="200px" $h="52px" $r="999px" style={{ marginTop: 22 }} />
          </div>
          <Shimmer $h="180px" $r="20px" />
        </Stage>

        <Layout aria-hidden>
          <div>
            <Band>
              <Row>
                <Shimmer $w="76px" $h="76px" $r="999px" />
                <div>
                  <Shimmer $w="190px" $h="22px" $mb="10px" />
                  <Shimmer $w="120px" $h="14px" />
                </div>
              </Row>
            </Band>
            <Band>
              <Shimmer $w="180px" $h="24px" $mb="20px" />
              {[0, 1, 2, 3, 4].map((i) => (
                <Row key={i}>
                  <Shimmer $w="34px" $h="34px" $r="999px" />
                  <Shimmer $w={`${72 - i * 8}%`} $h="18px" />
                </Row>
              ))}
            </Band>
          </div>

          <Side>
            <Shimmer $w="92px" $h="14px" />
            <Shimmer $w="170px" $h="40px" $r="12px" />
            <Shimmer $h="50px" $r="999px" />
            <Shimmer $h="50px" $r="999px" />
          </Side>
        </Layout>
      </Wrap>
    </Busy>
  );
}
