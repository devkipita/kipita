"use client";

import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";
import { Busy, Shimmer, SrOnly } from "@/components/ui/Shimmer";

const WIDE = "@media (min-width: 900px)";
const MOB = "@media (max-width: 899px)";

const Page = styled.div`
  width: min(1320px, 100%);
  margin: 0 auto;
  padding: 0 max(16px, var(--page-pad, 20px)) 64px;
  background: ${nocturne.bg};

  ${WIDE} {
    display: grid;
    grid-template-columns: minmax(0, 540px) minmax(0, 1fr);
    align-items: start;
    gap: 24px;
  }
`;

const MapArea = styled.div`
  ${WIDE} {
    order: 2;
    position: sticky;
    top: calc(var(--topbar-h, 64px) + 16px);
    height: calc(100dvh - var(--topbar-h, 64px) - 32px);
    margin-top: 16px;
    border-radius: 20px;
    overflow: hidden;
  }
  ${MOB} {
    position: fixed;
    top: var(--topbar-h, 56px);
    left: 0;
    right: 0;
    height: 46dvh;
  }
`;

const Details = styled.div`
  ${WIDE} {
    order: 1;
    min-width: 0;
  }
  ${MOB} {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: calc(var(--topbar-h, 56px) + 42dvh);
    padding: 0 16px calc(24px + var(--bottom-bar-space, 0px));
    border-radius: 24px 24px 0 0;
    background: ${nocturne.bg};
    overflow: hidden;
  }
`;

const Grip = styled.span`
  display: none;

  ${MOB} {
    display: block;
    width: 44px;
    height: 5px;
    margin: 20px auto 18px;
    border-radius: 999px;
    background: ${nocturne.muted2};
  }
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding-top: clamp(20px, 4vh, 40px);

  > :last-child {
    margin-left: auto;
  }

  ${MOB} {
    display: none;
  }
`;

const Stack = styled.div`
  display: grid;
  gap: 14px;
  margin-top: 18px;

  ${MOB} {
    margin-top: 0;
  }
`;

const Card = styled.div`
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 20px;
  background: ${nocturne.surface};

  ${WIDE} {
    padding: 22px;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  > div {
    display: grid;
    gap: 6px;
    flex: 1;
  }
`;

const Btns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

export function TripDetailSkeleton() {
  return (
    <Busy>
      <SrOnly>Loading this trip</SrOnly>
      <Page aria-hidden>
        <MapArea>
          <Shimmer $h="100%" $r="0" />
        </MapArea>

        <Details>
          <Grip />
          <Bar>
            <Shimmer $w="46px" $h="46px" $r="999px" />
            <Shimmer $w="88px" $h="34px" $r="10px" />
            <Shimmer $w="46px" $h="46px" $r="999px" />
          </Bar>

          <Stack>
            <Card>
              <Row>
                <Shimmer $w="128px" $h="30px" $r="999px" />
                <Shimmer $w="96px" $h="13px" />
              </Row>
              <Shimmer $w="55%" $h="24px" />
              <Shimmer $w="35%" $h="14px" />
              <Shimmer $w="50%" $h="24px" />
              <Shimmer $w="18%" $h="14px" />
            </Card>

            <Card>
              <Shimmer $w="120px" $h="20px" />
              <Row>
                <Shimmer $w="45%" $h="15px" />
                <Shimmer $w="80px" $h="15px" />
              </Row>
              <Row>
                <Shimmer $w="25%" $h="16px" />
                <Shimmer $w="110px" $h="24px" />
              </Row>
              <Shimmer $h="46px" $r="14px" />
              <Shimmer $h="52px" $r="999px" />
            </Card>

            <Card>
              <Who>
                <Shimmer $w="48px" $h="48px" $r="999px" />
                <div>
                  <Shimmer $w="55%" $h="16px" />
                  <Shimmer $w="35%" $h="12px" />
                </div>
                <Shimmer $w="44px" $h="44px" $r="999px" />
              </Who>
            </Card>

            <Btns>
              <Shimmer $h="52px" $r="999px" />
              <Shimmer $h="52px" $r="999px" />
            </Btns>
          </Stack>
        </Details>
      </Page>
    </Busy>
  );
}
