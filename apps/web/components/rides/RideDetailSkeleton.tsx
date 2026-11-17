"use client";

import styled from "styled-components";
import { CalendarBlank } from "@/components/icons";
import { GreenHero } from "@/components/ui/GreenHero";
import { Busy, Shimmer } from "@/components/ui/Shimmer";
import { nocturne } from "@/lib/nocturne";
import { Band, BookPanel, HeroFrame, Layout, MainCol, SideCol, Wrap } from "./RideLayout";

const HeroBar = styled.span<{ $w: string; $h?: string }>`
  display: inline-block;
  width: ${({ $w }) => $w};
  max-width: 100%;
  height: ${({ $h }) => $h ?? "0.78em"};
  border-radius: 10px;
  background: ${nocturne.greenDeep};
  vertical-align: middle;
`;

const LeadLines = styled.span`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const Who = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Stack = styled.div<{ $gap: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap};
`;

const Centre = styled(Stack)`
  align-items: center;
  padding-top: 4px;
`;

const Ticks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 30px;
`;

export function RideDetailSkeleton() {
  return (
    <Busy>
      <Wrap $max={1120}>
        <HeroFrame>
          <GreenHero
            back={{ href: "/home", label: "Back" }}
            status="Loading ride"
            title={<HeroBar $w="min(560px, 86%)" />}
            lead={
              <LeadLines>
                <HeroBar $w="min(420px, 92%)" $h="14px" />
                <HeroBar $w="min(300px, 64%)" $h="14px" />
              </LeadLines>
            }
            meta={[{ icon: <CalendarBlank size={20} />, label: <HeroBar $w="170px" $h="16px" /> }]}
          />
        </HeroFrame>

        <Layout>
          <MainCol>
            <Band>
              <Ticks>
                <Shimmer $w="120px" $h="20px" $r="6px" />
                <Shimmer $w="104px" $h="20px" $r="6px" />
                <Shimmer $w="96px" $h="20px" $r="6px" />
              </Ticks>
            </Band>
            <Band>
              <Row>
                <Shimmer $w="88px" $h="88px" $r="50%" />
                <Who>
                  <Shimmer $w="min(240px, 80%)" $h="28px" />
                  <Shimmer $w="min(200px, 70%)" $h="16px" />
                </Who>
              </Row>
            </Band>
            <Band>
              <Shimmer $w="min(320px, 90%)" $h="26px" />
            </Band>
          </MainCol>

          <SideCol>
            <BookPanel>
              <Shimmer $w="150px" $h="42px" />
              <Shimmer $w="130px" $h="16px" />
              <Stack $gap="12px">
                <Shimmer $h="54px" $r="999px" />
                <Shimmer $h="56px" $r="999px" />
              </Stack>
              <Stack $gap="11px">
                <Shimmer $h="16px" />
                <Shimmer $h="16px" />
                <Shimmer $h="16px" />
                <Shimmer $h="16px" />
              </Stack>
              <Centre $gap="10px">
                <Shimmer $w="124px" $h="84px" $r="14px" />
                <Shimmer $w="80%" $h="14px" />
                <Shimmer $w="60%" $h="14px" />
              </Centre>
            </BookPanel>
          </SideCol>
        </Layout>
      </Wrap>
    </Busy>
  );
}
