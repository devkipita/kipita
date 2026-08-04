import { create } from "zustand";
import { storage } from "@/lib/utils/mmkv";
import type { Review } from "@/lib/mock/reviews";

const REVIEWS_KEY = "user_reviews_v1";

/**
 * Reviews the current user has written after completing trips, keyed by the
 * reviewed person's id. Persisted locally so a fresh review shows up instantly
 * on that person's profile even though the mock backend doesn't store it.
 */
interface ReviewState {
  byPerson: Record<string, Review[]>;
  addReview: (personId: string, review: Review) => void;
  getReviews: (personId: string) => Review[];
  /** True once the user has reviewed this person (drives the trip screen UI). */
  hasReviewed: (personId: string, bookingId: string) => boolean;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  byPerson: storage.getJSON<Record<string, Review[]>>(REVIEWS_KEY) ?? {},

  addReview: (personId, review) =>
    set((s) => {
      const byPerson = {
        ...s.byPerson,
        [personId]: [review, ...(s.byPerson[personId] ?? [])],
      };
      storage.setJSON(REVIEWS_KEY, byPerson);
      return { byPerson };
    }),

  getReviews: (personId) => get().byPerson[personId] ?? [],

  hasReviewed: (personId, bookingId) =>
    (get().byPerson[personId] ?? []).some((r) => r.id === `booking-${bookingId}`),
}));
