import type { ToneName } from "@/lib/theme";

export type Tier = {
  key: "new" | "rising" | "regular" | "trusted" | "top";
  name: string;
  tone: ToneName;
  from: number;
};

const TIERS: Tier[] = [
  { key: "new", name: "New", tone: "lime", from: 0 },
  { key: "rising", name: "Rising", tone: "lav", from: 1 },
  { key: "regular", name: "Regular", tone: "blue", from: 10 },
  { key: "trusted", name: "Trusted", tone: "mint", from: 50 },
  { key: "top", name: "Top rider", tone: "tan", from: 100 },
];

export function tierFor(trips: number | null | undefined): Tier {
  const count = Math.max(0, trips ?? 0);
  let match = TIERS[0];
  for (const tier of TIERS) if (count >= tier.from) match = tier;
  return match;
}

export type UrgencyLevel = "soon" | "today" | "near" | "later";

export type Urgency = {
  level: UrgencyLevel;
  label: string;
  hours: number;
};

export function urgencyFor(
  date: string | null,
  time: string | null,
  now: Date,
): Urgency | null {
  if (!date) return null;

  const departs = new Date(`${date}T${time ?? "00:00"}:00+03:00`);
  if (Number.isNaN(departs.getTime())) return null;

  const ms = departs.getTime() - now.getTime();
  if (ms < 0) return null;

  const hours = ms / 3_600_000;

  if (hours < 2) {
    const minutes = Math.max(1, Math.round(ms / 60_000));
    return { level: "soon", label: `in ${minutes} min`, hours };
  }
  if (hours < 12) {
    return { level: "today", label: `in ${Math.round(hours)} h`, hours };
  }
  const days = Math.round(hours / 24);
  const label = `in ${days} ${days === 1 ? "day" : "days"}`;
  return { level: hours < 48 ? "near" : "later", label, hours };
}
