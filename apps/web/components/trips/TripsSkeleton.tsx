"use client";

import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";
import { Busy, Shimmer, SrOnly } from "@/components/ui/Shimmer";

const DESK = "@media (min-width: 861px)";

export const skeletonCard = `
  border-radius: 20px;
  background: ${nocturne.surface};
`;

const Wrap = styled.div`
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: clamp(20px, 4vh, 40px) max(16px, var(--page-pad, 20px)) 64px;
  background: ${nocturne.bg};

  @media (max-width: 960px) {
    padding-top: 0;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 50px;
`;

const Tabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 18px;
  padding: 4px;
  border-radius: 999px;
  background: ${nocturne.surface2};

  ${DESK} {
    width: 300px;
  }
`;

const Rows = styled.div`
  display: grid;
  gap: 14px;
  padding-top: 18px;
`;

const Card = styled.div`
  ${skeletonCard}
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "top top"
    "route route"
    "person money";
  gap: 16px 12px;
  padding: 18px;

  ${DESK} {
    grid-template-columns: minmax(0, 1fr) minmax(180px, 240px) auto;
    grid-template-areas:
      "top top top"
      "route person money";
    align-items: center;
    gap: 18px 32px;
    padding: 22px 26px;
  }
`;

const Top = styled.div`
  grid-area: top;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Route = styled.div`
  grid-area: route;
  display: grid;
  gap: 14px;

  ${DESK} {
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
`;

const Stop = styled.div`
  display: grid;
  gap: 6px;
`;

const Person = styled.div`
  grid-area: person;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Money = styled.div`
  grid-area: money;
  display: grid;
  justify-items: end;
  gap: 6px;
`;

export function TripsSkeleton() {
  return (
    <Busy>
      <Wrap>
        <SrOnly>Loading your trips</SrOnly>

        <Head aria-hidden>
          <Shimmer $w="120px" $h="38px" $r="10px" />
          <Shimmer $w="46px" $h="46px" $r="999px" />
        </Head>

        <Tabs aria-hidden>
          <Shimmer $h="42px" $r="999px" />
          <span />
        </Tabs>

        <Rows aria-hidden>
          {[0, 1].map((i) => (
            <Card key={i}>
              <Top>
                <Shimmer $w="104px" $h="30px" $r="999px" />
                <Shimmer $w="90px" $h="13px" />
              </Top>
              <Route>
                <Stop>
                  <Shimmer $w="70%" $h="20px" />
                  <Shimmer $w="45%" $h="13px" />
                </Stop>
                <Stop>
                  <Shimmer $w="60%" $h="20px" />
                  <Shimmer $w="25%" $h="13px" />
                </Stop>
              </Route>
              <Person>
                <Shimmer $w="36px" $h="36px" $r="999px" />
                <Stop>
                  <Shimmer $w="110px" $h="14px" />
                  <Shimmer $w="50px" $h="12px" />
                </Stop>
              </Person>
              <Money>
                <Shimmer $w="96px" $h="19px" />
                <Shimmer $w="80px" $h="12px" />
              </Money>
            </Card>
          ))}
        </Rows>
      </Wrap>
    </Busy>
  );
}
