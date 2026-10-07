"use client";

import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";
import type { HomeTrip } from "@/lib/home/search";

export type TimeBucket = "early" | "midday" | "late";
export type PrefKey = "verified" | "luggage" | "quiet";

export type RideFilterState = {
  times: TimeBucket[];
  prefs: PrefKey[];
};

export const EMPTY_FILTERS: RideFilterState = { times: [], prefs: [] };

export const TIME_OPTIONS: { key: TimeBucket; label: string }[] = [
  { key: "early", label: "Before 08:00" },
  { key: "midday", label: "08:00 – 12:00" },
  { key: "late", label: "After 12:00" },
];

export const PREF_OPTIONS: { key: PrefKey; label: string; hint?: string }[] = [
  { key: "verified", label: "Verified drivers" },
  { key: "luggage", label: "Luggage space" },
  { key: "quiet", label: "Quiet ride" },
];

function minutesOf(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

function inBucket(mins: number, bucket: TimeBucket): boolean {
  if (bucket === "early") return mins < 480;
  if (bucket === "midday") return mins >= 480 && mins < 720;
  return mins >= 720;
}

/**
 * Trips without a departure time are dropped once any time bucket is active —
 * `searchTrips` deliberately keeps undated trips, so this narrowing only
 * applies when the traveller has asked for a specific part of the day.
 */
export function applyRideFilters(
  trips: HomeTrip[],
  f: RideFilterState,
): HomeTrip[] {
  return trips.filter((t) => {
    if (f.times.length) {
      const mins = minutesOf(t.departure_time);
      if (mins === null) return false;
      if (!f.times.some((b) => inBucket(mins, b))) return false;
    }
    if (f.prefs.includes("verified") && !t.person?.is_verified) return false;
    if (f.prefs.includes("luggage") && !t.preferences?.luggage) return false;
    if (f.prefs.includes("quiet") && !t.preferences?.silent_ride) return false;
    return true;
  });
}

const Panel = styled.div`
  display: flex;
  flex-direction: column;
`;

const Group = styled.fieldset`
  margin: 0;
  padding: 20px 0;
  border: none;
  border-bottom: 1px solid ${nocturne.line};

  &:first-child {
    padding-top: 4px;
  }
`;

const Legend = styled.legend`
  padding: 0;
  margin-bottom: 14px;
  font-size: 17px;
  font-weight: 700;
  color: ${nocturne.cream};
`;

const Row = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0;
  padding: 7px 0;
  font-size: 15px;
  line-height: 1.4;
  color: ${nocturne.muted};
  cursor: pointer;

  input {
    flex: none;
    width: 19px;
    height: 19px;
    margin: 0;
    accent-color: ${nocturne.accent};
    cursor: pointer;
  }
  input:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  &:hover {
    color: ${nocturne.cream};
  }
`;

const Reset = styled.button`
  align-self: flex-start;
  margin-top: 18px;
  padding: 8px 14px;
  border: 1px solid ${nocturne.line};
  border-radius: 999px;
  background: transparent;
  color: ${nocturne.cream};
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${nocturne.surface2};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

export function RideFilters({
  value,
  onChange,
}: {
  value: RideFilterState;
  onChange: (next: RideFilterState) => void;
}) {
  const active = value.times.length + value.prefs.length;

  function toggleTime(k: TimeBucket) {
    onChange({
      ...value,
      times: value.times.includes(k)
        ? value.times.filter((x) => x !== k)
        : [...value.times, k],
    });
  }

  function togglePref(k: PrefKey) {
    onChange({
      ...value,
      prefs: value.prefs.includes(k)
        ? value.prefs.filter((x) => x !== k)
        : [...value.prefs, k],
    });
  }

  return (
    <Panel>
      <Group>
        <Legend>Departure time</Legend>
        {TIME_OPTIONS.map((o) => (
          <Row key={o.key}>
            <input
              type="checkbox"
              checked={value.times.includes(o.key)}
              onChange={() => toggleTime(o.key)}
            />
            {o.label}
          </Row>
        ))}
      </Group>

      <Group>
        <Legend>Preferences</Legend>
        {PREF_OPTIONS.map((o) => (
          <Row key={o.key}>
            <input
              type="checkbox"
              checked={value.prefs.includes(o.key)}
              onChange={() => togglePref(o.key)}
            />
            {o.label}
          </Row>
        ))}
      </Group>

      {active > 0 && (
        <Reset type="button" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear {active} {active === 1 ? "filter" : "filters"}
        </Reset>
      )}
    </Panel>
  );
}
