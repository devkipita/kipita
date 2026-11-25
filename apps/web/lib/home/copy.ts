import type { AppMode } from "./mode";

export const HOME_COPY = {
  greeting: (name: string) => ({ lead: "Karibu, ", name, tail: "." }),
  greetingSub: {
    passenger: "Rides on your routes.",
    driver: "Passengers on your routes.",
  } satisfies Record<AppMode, string>,

  mapLabel: "Kenya, right now",
  mapHint: "Open the map",
  mapTeaserTitle: "See who is on the road",
  mapTeaserCta: "Show live map",
  mapHide: "Hide map",
  mapEmpty: "Quiet today. Popular routes:",
  mapUnavailable:
    "Map unavailable. Search still works.",

  fromLabel: "From",
  fromDetecting: "Locating you…",
  fromIdle: "Set your pickup",
  fromHint: "Guessed from your connection",
  toLabel: "Going to",
  toPlaceholder: "Anywhere in Kenya",
  searchPlaceholder: {
    passenger: "Find a ride",
    driver: "Find passengers",
  } satisfies Record<AppMode, string>,
  whenNow: "Leave now",
  whenLater: "Later",
  searchCta: {
    passenger: "Find rides",
    driver: "Find passengers",
  } satisfies Record<AppMode, string>,

  planTitle: "Plan your ride",
  placeTitleFrom: "Where are you starting?",
  placeDescFrom:
    "Based on your location. Change it if wrong.",
  placeTitleTo: "Where are you headed?",
  placeDescTo: "Pick a town or a route.",
  placeInputFrom: "Leaving from…",
  placeInputTo: "Going to…",
  sectionPopular: "Popular right now",
  sectionNear: "Near you",
  sectionRecent: "Where you've been looking",
  sectionAll: "Towns across Kenya",
  sectionResults: "Matches",
  noMatch: (q: string) => `No town "${q}". Try the county.`,

  whenTitle: "When are you travelling?",
  whenDesc: 'Leave on "now" to see everything upcoming.',

  ridesCount: (n: number) =>
    n === 1 ? "1 going your way" : `${n} going your way`,
  requestsCount: (n: number) =>
    n === 1 ? "1 looking for a lift" : `${n} looking for a lift`,

  promosTitle: "Before you travel",
  offersTitle: "Offers for you",

  alertsTitle: "Road alerts",
  alertsSeeAll: "See all",
  alertsPost: "Post an alert",
  emptyAlerts: "No alerts nearby",
  emptyAlertsBody:
    "No alerts on these roads yet.",

  errorTitle: "That didn't load",
  errorBody: "Check your connection.",
  retry: "Try again",
  notOnMap: "Not on the map",
} as const;
