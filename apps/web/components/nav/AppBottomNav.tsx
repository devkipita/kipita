"use client";

import { useMemo } from "react";
import { BottomTabBar } from "./BottomTabBar";
import { bottomNavFor, type NavItem } from "./nav-items";

/**
 * The app's only bottom bar. It computes its own items rather than taking them
 * as props, so a server component (the landing) can render it too — nav items
 * carry icon components, which cannot cross the RSC boundary.
 */
export function AppBottomNav({
  counts,
}: {
  counts?: Partial<Record<NonNullable<NavItem["badge"]>, number>>;
}) {
  const items = useMemo(() => bottomNavFor(), []);
  return <BottomTabBar items={items} counts={counts} />;
}
