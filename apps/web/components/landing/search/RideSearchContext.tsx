"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useRideSearch, type UseRideSearch } from "./useRideSearch";

const Ctx = createContext<UseRideSearch | null>(null);

/** One search shared by the hero form and the results section below it. */
export function RideSearchProvider({ children }: { children: ReactNode }) {
  const search = useRideSearch();
  return <Ctx.Provider value={search}>{children}</Ctx.Provider>;
}

export function useSharedRideSearch(): UseRideSearch {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error(
      "useSharedRideSearch must be used inside RideSearchProvider",
    );
  }
  return value;
}

/** Lift the page to the "See who's going your way" section, where results render. */
export function scrollToFind() {
  const el = document.getElementById("find");
  if (!el) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
}
