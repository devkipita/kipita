"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectCity,
  fetchTowns,
  searchRides,
  type SearchOutcome,
  type Town,
  type When,
} from "@/lib/rides";

/** Where the search UI currently is in its little life-cycle. */
export type SearchPhase = "idle" | "searching" | "settled";

export type RideSearchState = {
  /** Whether the second ("from") input has been revealed. */
  expanded: boolean;
  from: string;
  to: string;
  when: When;
  /** All active towns, for the destination suggestions. */
  towns: Town[];
  /** True while we're auto-detecting the user's city from their IP. */
  detecting: boolean;
  /** True once "from" was filled by IP detection (so we can badge it). */
  fromAutofilled: boolean;
  phase: SearchPhase;
  outcome: SearchOutcome | null;
};

const INITIAL: RideSearchState = {
  expanded: false,
  from: "",
  to: "",
  when: { mode: "now" },
  towns: [],
  detecting: false,
  fromAutofilled: false,
  phase: "idle",
  outcome: null,
};

/**
 * Owns all the state + data-fetching for the ride search so the view
 * components can stay declarative. One hook, one source of truth.
 */
export function useRideSearch() {
  const [state, setState] = useState<RideSearchState>(INITIAL);
  const patch = useCallback(
    (next: Partial<RideSearchState>) =>
      setState((prev) => ({ ...prev, ...next })),
    [],
  );

  const detectRan = useRef(false);
  const searchSeq = useRef(0);

  // Load the town list once, up front — it's tiny and drives suggestions.
  useEffect(() => {
    let alive = true;
    fetchTowns().then((towns) => {
      if (alive) setState((prev) => ({ ...prev, towns }));
    });
    return () => {
      alive = false;
    };
  }, []);

  /** Reveal the "from" input and (once) auto-detect the traveller's city. */
  const expand = useCallback(() => {
    setState((prev) => (prev.expanded ? prev : { ...prev, expanded: true }));

    if (detectRan.current) return;
    detectRan.current = true;

    setState((prev) => (prev.from ? prev : { ...prev, detecting: true }));

    const controller = new AbortController();
    detectCity(controller.signal).then((city) => {
      setState((prev) => {
        // Don't clobber a value the user has already typed.
        if (prev.from) return { ...prev, detecting: false };
        if (!city) return { ...prev, detecting: false };
        return { ...prev, from: city, fromAutofilled: true, detecting: false };
      });
    });
  }, []);

  const setFrom = useCallback((from: string) => {
    setState((prev) => ({ ...prev, from, fromAutofilled: false }));
  }, []);

  const setTo = useCallback((to: string) => {
    patch({ to });
  }, [patch]);

  const setWhen = useCallback((when: When) => {
    patch({ when });
  }, [patch]);

  /** Run the search. `to` is required; `from` falls back to the typed value. */
  const run = useCallback(
    async (over?: { from?: string; to?: string }) => {
      const from = (over?.from ?? state.from).trim();
      const to = (over?.to ?? state.to).trim();
      if (!to) return;

      const seq = ++searchSeq.current;
      setState((prev) => ({
        ...prev,
        expanded: true,
        from: from || prev.from,
        to,
        phase: "searching",
      }));

      const outcome = await searchRides(from, to, state.when);

      // Ignore a stale response if a newer search has started.
      if (seq !== searchSeq.current) return;
      setState((prev) => ({ ...prev, phase: "settled", outcome }));
    },
    [state.from, state.to, state.when],
  );

  const reset = useCallback(() => {
    searchSeq.current++;
    setState((prev) => ({
      ...INITIAL,
      towns: prev.towns,
      // keep the collapsed pill open once the user has engaged
      expanded: prev.expanded,
      from: prev.from,
      fromAutofilled: prev.fromAutofilled,
    }));
  }, []);

  return {
    ...state,
    expand,
    setFrom,
    setTo,
    setWhen,
    run,
    reset,
  };
}

export type UseRideSearch = ReturnType<typeof useRideSearch>;
