"use client";

import { useMemo } from "react";
import { BottomTabBar } from "./BottomTabBar";
import type { AppMode } from "@/lib/home/mode";
import { bottomNavFor, type NavCounts } from "./nav-items";

/**
 * The app's only bottom bar. It computes its own items rather than taking them
 * as props, so a server component (the landing) can render it too — nav items
 * carry icon components, which cannot cross the RSC boundary.
 */
export function AppBottomNav({
  counts,
  mode,
}: {
  counts?: NavCounts;
  mode?: AppMode;
}) {
  const items = useMemo(() => bottomNavFor(mode), [mode]);
  return <BottomTabBar items={items} counts={counts} />;
}
