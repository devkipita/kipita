import { Suspense, type ReactNode } from "react";
import { AlertsAsideData } from "@/components/alerts/AlertsAsideData";
import { AlertsAsideSkeleton } from "@/components/alerts/AlertsAsideSkeleton";
import { AlertsColumns } from "@/components/alerts/AlertsColumns";
import { AlertsSearch, AlertsSearchField } from "@/components/alerts/AlertsSearch";

export default function AlertsLayout({ children }: { children: ReactNode }) {
  return (
    <AlertsColumns
      aside={
        <>
          <Suspense fallback={<AlertsSearchField />}>
            <AlertsSearch />
          </Suspense>
          <Suspense fallback={<AlertsAsideSkeleton />}>
            <AlertsAsideData />
          </Suspense>
        </>
      }
    >
      {children}
    </AlertsColumns>
  );
}
