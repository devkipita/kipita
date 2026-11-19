"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchForMode, type HomeItem } from "@/lib/home/search";
import { recordRouteInterest } from "@/lib/home/route-interest";
import type { AppMode } from "@/lib/home/mode";
import type { SearchForm } from "./RouteSearchForm";

export type SearchPhase = "ready" | "searching" | "error";

export function useHomeSearch(
  mode: AppMode,
  initialItems: HomeItem[],
  initialPhase: SearchPhase = "ready",
) {
  const [items, setItems] = useState<HomeItem[]>(initialItems);
  const [phase, setPhase] = useState<SearchPhase>(initialPhase);
  const [refreshing, setRefreshing] = useState(false);
  const [lastForm, setLastForm] = useState<SearchForm | null>(null);
  const [searchRequested, setSearchRequested] = useState(false);
  const seq = useRef(0);

  const itemsRef = useRef(initialItems);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const run = useCallback(
    async (form: SearchForm | null, options: { deliberate?: boolean } = {}) => {
      const mine = ++seq.current;
      if (form) setLastForm(form);
      if (options.deliberate) setSearchRequested(true);

      const quiet = !options.deliberate && itemsRef.current.length > 0;
      if (quiet) setRefreshing(true);
      else setPhase("searching");

      try {
        const found = await searchForMode(createClient(), mode, {
          from: form?.from,
          to: form?.to,
          date: form?.date,
          departure_time: form?.departure_time,
          seats: form?.seats,
        });
        if (seq.current !== mine) return;
        setItems(found);
        setPhase("ready");
      } catch {
        if (seq.current !== mine) return;
        setPhase(quiet ? "ready" : "error");
      } finally {
        if (seq.current === mine) setRefreshing(false);
      }

      if (form?.from && form?.to) {
        void recordRouteInterest(form.from, form.to);
      }
    },
    [mode],
  );

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
