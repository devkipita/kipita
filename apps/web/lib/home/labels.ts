import type { AppMode } from "./mode";

/**
 * Per-mode copy — the web port of mobile's `ROLE_CONFIG`
 * (`apps/mobile/src/lib/constants/index.ts`). Mobile stores i18n *keys* because
 * it has a locale layer; the web app has none yet, so these are the strings.
 * Keep the two in step: same shape, same meanings.
 */
type RoleCopy = {
  /** What the other party is called in this mode. */
  counterpart: string;
  searchCTA: string;
  carouselTitle: string;
  emptyTitle: string;
  emptyBody: string;
  postAction: string;
  postTitle: string;
  postPrompt: string;
  postedTitle: string;
  preferencesLabel: string;
  seatsLabel: string;
};

export const ROLE_COPY: Record<AppMode, RoleCopy> = {
  passenger: {
    counterpart: "driver",
    searchCTA: "Search rides",
    carouselTitle: "Available rides",
    emptyTitle: "No rides found",
    emptyBody:
      "Nobody is running this route yet. Post a request and we'll tell drivers heading your way.",
    postAction: "Post a request",
    postTitle: "Post your trip",
    postPrompt: "Drivers on this route will see it the moment you post.",
    postedTitle: "Request posted",
    preferencesLabel: "Ride preferences",
    seatsLabel: "Seats needed",
  },
  driver: {
    counterpart: "passenger",
    searchCTA: "Search requests",
    carouselTitle: "Passenger requests",
    emptyTitle: "No requests found",
    emptyBody:
      "No passengers are looking for this route yet. Offer your ride and they'll find you.",
    postAction: "Post a ride",
    postTitle: "Offer your ride",
    postPrompt: "Passengers on this route will see it the moment you post.",
    postedTitle: "Ride posted",
    preferencesLabel: "Accepted options",
    seatsLabel: "Seats offered",
  },
};

export const MIN_SEATS = 1;
export const MAX_SEATS = 8;

/** Fares travellers pick most — one tap instead of typing (mirrors PostSheet). */
export const PRICE_PRESETS = [900, 1500, 3000];

export const DISCOUNTS = [10, 15, 20, 25];
