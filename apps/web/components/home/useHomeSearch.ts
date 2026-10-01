"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchForMode, type HomeItem } from "@/lib/home/search";
import { recordRouteInterest } from "@/lib/home/route-interest";
import type { AppMode } from "@/lib/home/mode";
import type { SearchForm } from "./RouteSearchForm";

export type SearchPhase = "ready" | "searching" | "error";

/**
 * Search state for the home carousel.
 *
 * Seeded from the server render, then re-runs entirely client-side — no
 * navigation, no RSC round trip. A sequence guard drops stale responses when
 * someone searches twice quickly, the same trick `useRideSearch.ts` uses on the
 * landing page.
 *
 * `searchRequested` is what lets the post drawer open on an empty *deliberate*
 * search without also firing on an empty first paint.
 */
export function useHomeSearch(mode: AppMode, initialItems: HomeItem[]) {
  const [items, setItems] = useState<HomeItem[]>(initialItems);
  const [phase, setPhase] = useState<SearchPhase>("ready");
  const [refreshing, setRefreshing] = useState(false);
  const [lastForm, setLastForm] = useState<SearchForm | null>(null);
  const [searchRequested, setSearchRequested] = useState(false);
  const seq = useRef(0);

  // Read inside `run` without making `items` a dependency — that would rebuild
  // the callback on every result and re-fire the effects that depend on it.
  const itemsRef = useRef(initialItems);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const run = useCallback(
    async (form: SearchForm | null, options: { deliberate?: boolean } = {}) => {
      const mine = ++seq.current;
      if (form) setLastForm(form);
      if (options.deliberate) setSearchRequested(true);

      // Skeletons only when there is nothing to keep on screen. Otherwise the
      // current results stay put and the refresh happens behind them.
      const hadItems = itemsRef.current.length > 0;
      if (hadItems) setRefreshing(true);
      else setPhase("searching");

      try {
        const found = await searchForMode(createClient(), mode, {
          from: form?.from,
          to: form?.to,
          date: form?.date,
          departure_time: form?.departure_time,
        });
        if (seq.current !== mine) return; // a newer search already landed
        setItems(found);
        setPhase("ready");
      } catch {
        if (seq.current !== mine) return;
        setPhase(hadItems ? "ready" : "error");
      } finally {
        if (seq.current === mine) setRefreshing(false);
      }

      if (form?.from && form?.to) {
        void recordRouteInterest(form.from, form.to);
      }
    },
    [mode],
  );

  /** The post drawer consumes this, then clears it. */
  const clearSearchRequest = useCallback(() => setSearchRequested(false), []);

  return {
    items,
    phase,
    refreshing,
    lastForm,
    searchRequested,
    run,
    clearSearchRequest,
    setItems,
  };
}
