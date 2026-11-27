"use client";

import { Busy, Shimmer, SrOnly } from "@/components/ui/Shimmer";
import { ActivitySkeletonRows } from "./ActivityStates";
import { FILTERS, Head, INBOX_MAX, Page, Sub, Tab, Tabs } from "./NotificationsView";

export function NotificationsSkeleton() {
  return (
    <Busy>
      <SrOnly>Loading your activity</SrOnly>
      <Page $max={INBOX_MAX} aria-hidden="true">
        <Head>
          <div>
            <h1 data-bar-title="">Activity</h1>
            <Sub as="div">
              <Shimmer $w="96px" $h="14px" $r="6px" />
            </Sub>
          </div>
        </Head>
        <Tabs>
          {FILTERS.map((f, i) => (
            <Tab key={f.key} as="span" $on={i === 0} $selected={i === 0}>
              <span className="t">{f.label}</span>
            </Tab>
          ))}
        </Tabs>
        <ActivitySkeletonRows rows={7} />
      </Page>
    </Busy>
  );
}
