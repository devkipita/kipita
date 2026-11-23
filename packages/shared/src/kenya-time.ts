/**
 * Kenya time.
 *
 * Kipita runs in Kenya, so a ride's date and time always mean Kenya wall-clock time, whatever the
 * clock on the phone, laptop or server looking at it says. A driver in Cape Town, a developer in
 * London and a server in UTC all have to agree on whether a ride has left.
 *
 * Kenya is UTC+3 all year (no daylight saving), so a fixed offset is exact and none of this depends
 * on the device's time zone or on Intl. The database does the same sum in `trip_departs_at()`
 * (migration 067).
 */

const KENYA_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

export interface KenyaClock {
  /** the date in Kenya, YYYY-MM-DD */
  date: string;
  /** the time in Kenya, HH:MM (24 hour) */
  time: string;
  /** minutes since midnight in Kenya */
  minutes: number;
}

/** What the clock on the wall in Kenya shows at this moment. */
export function kenyaClock(at: Date = new Date()): KenyaClock {
  // Shift the instant by the Kenya offset, then read it as UTC.
  const k = new Date(at.getTime() + KENYA_OFFSET_MS);
  const hours = k.getUTCHours();
  const mins = k.getUTCMinutes();
  return {
    date: `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`,
    time: `${pad(hours)}:${pad(mins)}`,
    minutes: hours * 60 + mins,
  };
}

/** Today's date in Kenya as YYYY-MM-DD; `offsetDays` moves it forward or back. */
export function kenyaToday(offsetDays = 0, at: Date = new Date()): string {
  return kenyaClock(new Date(at.getTime() + offsetDays * DAY_MS)).date;
}

/**
 * The moment a ride leaves, from its stored date ("2026-11-20") and time ("14:00" or "14:00:00"),
 * both in Kenya time. A missing time counts as midnight at the start of the day. Returns null when
 * the date or time is not a real one.
 */
export function departureInstant(
  date: string | null | undefined,
  time?: string | null,
): Date | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? "");
  if (!day) return null;
  const [, y, mo, d] = day;

  const [hh = "00", mm = "00"] = (time ?? "00:00").split(":");
  const hour = Number(hh);
  const minute = Number(mm);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const instant = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), hour, minute) - KENYA_OFFSET_MS);
  // Rejects dates that roll over, like 2026-02-31.
  return kenyaClock(instant).date === `${y}-${mo}-${d}` ? instant : null;
}

/** True once the ride's departure time has passed in Kenya. A ride with no usable date has not left. */
export function hasDeparted(
  date: string | null | undefined,
  time?: string | null,
  at: Date = new Date(),
): boolean {
  const left = departureInstant(date, time);
  return left !== null && left.getTime() <= at.getTime();
}

/** A calendar day (YYYY-MM-DD) as a local Date at midnight, for drawing calendars. */
export function dateFromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
