"use client";

import { useEffect, useState } from "react";
import type { PlaceCard } from "@/lib/places";

/**
 * Photo + weather for a set of towns, resolved through `/api/places`.
 *
 * Results are memoised for the tab's lifetime, so scrolling a carousel or
 * re-running a search never re-asks for a town already seen. Misses are cached
 * too — a town Wikipedia has no picture for should be asked about once.
 */

const cache = new Map<string, PlaceCard>();
const inFlight = new Set<string>();

export function usePlaces(
  towns: (string | null | undefined)[],
): Map<string, PlaceCard> {
  const wanted = [
    ...new Set(
      towns
        .filter(Boolean)
        .map((t) => (t as string).trim())
        .filter(Boolean),
    ),
  ];
  const key = wanted
    .map((t) => t.toLowerCase())
    .sort()
    .join("|");

  const [, bump] = useState(0);

  useEffect(() => {
    const missing = wanted.filter(
      (t) => !cache.has(t.toLowerCase()) && !inFlight.has(t.toLowerCase()),
    );
    if (missing.length === 0) return;

    for (const t of missing) inFlight.add(t.toLowerCase());

    void (async () => {
      try {
        const response = await fetch(
          `/api/places?towns=${encodeURIComponent(missing.join(","))}`,
        );
        if (!response.ok) return;
        const data: { places: Record<string, PlaceCard> } =
          await response.json();
        for (const [name, card] of Object.entries(data.places ?? {})) {
          cache.set(name, card);
        }
        // Remember the misses too, so an unknown town is asked about once.
        for (const t of missing) {
          if (!cache.has(t.toLowerCase())) {
            cache.set(t.toLowerCase(), {
              town: t,
              photo: null,
              weather: null,
              county: null,
            });
          }
        }
        // No unmount guard: Strict Mode's throwaway first mount owns the fetch,
        // and the remounted instance is skipped by `inFlight`, so it must bump.
        bump((n) => n + 1);
      } catch {
        // Cards render without enrichment.
      } finally {
        for (const t of missing) inFlight.delete(t.toLowerCase());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return cache;
}
