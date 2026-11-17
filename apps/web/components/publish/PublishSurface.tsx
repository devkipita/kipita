"use client";

import { useSyncExternalStore } from "react";
import type { SavedCar } from "./draft";
import { PublishMobile } from "./PublishMobile";
import { PublishSkeleton } from "./PublishSkeleton";
import { PublishWeb } from "./PublishWeb";

const QUERY = "(max-width: 899px)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

export function PublishSurface({
  savedCars,
  publishBeforeApproval,
  driverName,
  userId,
}: {
  savedCars: SavedCar[];
  publishBeforeApproval: boolean;
  driverName: string;
  userId: string;
}) {
  const phone = useSyncExternalStore<boolean | null>(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => null,
  );

  if (phone === null) return <PublishSkeleton />;
  return phone ? (
    <PublishMobile userId={userId} savedCars={savedCars} publishBeforeApproval={publishBeforeApproval} />
  ) : (
    <PublishWeb userId={userId} savedCars={savedCars} publishBeforeApproval={publishBeforeApproval} driverName={driverName} />
  );
}
