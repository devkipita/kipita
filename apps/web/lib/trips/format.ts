/**
 * Trip formatting, pinned to Africa/Nairobi.
 *
 * The timezone is not cosmetic. "Today" resolved against the host clock gives
 * UTC on the server and local time in the browser, so a trip can render as
 * "Today" on one side and "12 Sep" on the other — a hydration mismatch. Fixing
 * the zone makes both sides agree, and a Kenyan trip's date is Kenyan anyway.
 */

const ZONE = "Africa/Nairobi";

/** Today's date in Nairobi as YYYY-MM-DD, independent of where this runs. */
function nairobiToday(offsetDays = 0): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatCurrency(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

export function formatTripDate(iso: string | null): string {
  if (!iso) return "";
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";

  if (day === nairobiToday()) return "Today";
  if (day === nairobiToday(1)) return "Tomorrow";
  if (day === nairobiToday(-1)) return "Yesterday";

  const date = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    day: "numeric",
    month: "short",
    year: day.slice(0, 4) === nairobiToday().slice(0, 4) ? undefined : "numeric",
  }).format(date);
}

export function formatTripTime(value: string | null): string {
  if (!value) return "";
  const [h, m] = value.split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour < 12 ? "am" : "pm";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${m ?? "00"} ${suffix}`;
}
