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
  make: string;
  model: string;
  plate: string;
  color?: string;
};
