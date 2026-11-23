"use client";

import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";
import { Busy, Shimmer, SrOnly } from "@/components/ui/Shimmer";
import { TabIndicator } from "@/components/ui/TabIndicator";
import { SectionHead } from "./RideRow";
import { TripFaqs } from "./TripFaqs";
import {
  Booked,
  Controls,
  Head,
  HeadRow,
  HelpGrid,
  Page,
  Section,
  TabButton,
  Tabs,
} from "./TripsView";

const DESK = "@media (min-width: 861px)";

const Rows = styled.div`
  display: grid;
  gap: 12px;
  padding-top: 16px;
`;

const Card = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "top top"
    "route route"
    "person money";
  gap: 16px 12px;
  padding: 16px;
  border-radius: 20px;
  background: ${nocturne.surface};

  ${DESK} {
    grid-template-columns: minmax(0, 1fr) minmax(180px, 240px) auto;
    grid-template-areas:
      "top top top"
      "route person money";
    align-items: center;
    gap: 16px 32px;
    padding: 24px;
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
  gap: 12px;

  ${DESK} {
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
`;

const Stop = styled.div`
  display: grid;
  gap: 8px;
`;

const Person = styled.div`
  grid-area: person;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Money = styled.div`
  grid-area: money;
  display: grid;
  justify-items: end;
  gap: 8px;
`;

export function TripsSkeleton() {
  return (
    <Page $max={1080}>
      <Head>
        <HeadRow $open={false}>
          <h1>Trips</h1>
        </HeadRow>
      </Head>

      <Booked $first>
        <Controls>
          <Tabs aria-hidden>
            <TabButton as="span" $active>
              <TabIndicator group="trips-skeleton" tone="underline" />
              <span className="text">Current</span>
            </TabButton>
            <TabButton as="span" $active={false}>
              <span className="text">Previous</span>
            </TabButton>
          </Tabs>
        </Controls>

        <Busy>
          <SrOnly>Loading your trips</SrOnly>
          <Rows aria-hidden>
            {[0, 1].map((i) => (
              <Card key={i}>
                <Top>
                  <Shimmer $w="104px" $h="28px" $r="6px" />
                  <Shimmer $w="88px" $h="12px" />
                </Top>
                <Route>
                  <Stop>
                    <Shimmer $w="70%" $h="20px" />
                    <Shimmer $w="44%" $h="12px" />
                  </Stop>
                  <Stop>
                    <Shimmer $w="60%" $h="20px" />
                    <Shimmer $w="24%" $h="12px" />
                  </Stop>
                </Route>
                <Person>
                  <Shimmer $w="36px" $h="36px" $r="999px" />
                  <Stop>
                    <Shimmer $w="112px" $h="14px" />
                    <Shimmer $w="48px" $h="12px" />
                  </Stop>
                </Person>
                <Money>
                  <Shimmer $w="96px" $h="20px" />
                  <Shimmer $w="80px" $h="12px" />
                </Money>
              </Card>
            ))}
          </Rows>
        </Busy>
      </Booked>

      <Section id="help">
        <SectionHead>Need help?</SectionHead>
        <HelpGrid>
          <div>
            <h3>Common questions</h3>
            <TripFaqs />
          </div>
        </HelpGrid>
      </Section>
    </Page>
  );
}
