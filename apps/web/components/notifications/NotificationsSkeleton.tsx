"use client";

import styled from "styled-components";
import { Busy, Shimmer, SrOnly } from "@/components/ui/Shimmer";
import { ActivitySkeletonRows } from "./ActivityStates";
import { Head, INBOX_MAX, Page, Tabs } from "./NotificationsView";

const TabSkel = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
`;

export function NotificationsSkeleton() {
  return (
    <Busy>
      <SrOnly>Loading your activity</SrOnly>
      <Page $max={INBOX_MAX} aria-hidden="true">
        <Head>
          <div>
            <Shimmer $w="160px" $h="44px" $r="12px" />
            <Shimmer $w="110px" $h="16px" $r="8px" $mb="2px" />
          </div>
          <Shimmer $w="164px" $h="44px" $r="999px" />
        </Head>
        <Tabs>
          {[58, 70, 98, 74].map((w) => (
            <TabSkel key={w}>
              <Shimmer $w={`${w}px`} $h="36px" $r="999px" />
            </TabSkel>
          ))}
        </Tabs>
        <ActivitySkeletonRows rows={7} />
      </Page>
    </Busy>
  );
}
