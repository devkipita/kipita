import type { RidePreferences } from "@/lib/ride-detail";
import { todayISO } from "./WhenPicker";

const KEY = "kipita:publish-draft:v1";

export type StoredDraft = {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number | null;
  price: string;
  make: string;
  model: string;
  plate: string;
  color: string;
  carMode?: "saved" | "new" | "none";
  prefs: Partial<Record<keyof RidePreferences, boolean>>;
  step?: number;
  maxStep?: number;
};

export type Prefill = { from: string; to: string; date: string };

export function readPrefill(params: URLSearchParams | null): Prefill | null {
  const from = params?.get("from")?.trim().slice(0, 80) ?? "";
  const to = params?.get("to")?.trim().slice(0, 80) ?? "";
  const rawDate = params?.get("date") ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate >= todayISO() ? rawDate : "";
  return from || to ? { from, to, date } : null;
}

export function withPrefill<T extends { from: string; to: string; date: string; time: string }>(draft: T, prefill: Prefill): T {
  return {
    ...draft,
    from: prefill.from || draft.from,
    to: prefill.to || draft.to,
    date: prefill.date || draft.date,
    time: prefill.date ? "" : draft.time,
  };
}

export function loadDraft(): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as StoredDraft;
    if (saved.date && saved.date < todayISO()) {
      saved.date = "";
      saved.time = "";
    }
    return saved;
  } catch {
    return null;
  }
}

export function saveDraft(draft: StoredDraft) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {}
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}

export type SavedCar = {
  id?: string;
  make: string;
  model: string;
  plate: string;
  color?: string;
};
