import type { AppMode } from "./mode";

export const HOME_COPY = {
  greeting: (name: string) => `Karibu, ${name}.`,
  greetingSub: {
    passenger: "Rides on your routes, updated as drivers post them.",
    driver: "Passengers looking for a seat on the routes you drive.",
  } satisfies Record<AppMode, string>,

  mapLabel: "Kenya, right now",
  mapHint: "Open the map",
  mapTeaserTitle: "See who is on the road",
  mapTeaserCta: "Show live map",
  mapHide: "Hide map",
  mapEmpty: "Quiet roads today — these are the routes people travel most.",
  mapUnavailable: "The map is unavailable right now. Search and booking still work.",

  fromLabel: "From",
  fromDetecting: "Locating you…",
  fromIdle: "Set your pickup",
  fromHint: "Guessed from your connection",
  toLabel: "Where to",
  toPlaceholder: "Anywhere in Kenya",
  whenNow: "Leave now",
  whenLater: "Later",
  searchCta: {
    passenger: "Find rides",
    driver: "Find passengers",
  } satisfies Record<AppMode, string>,

  planTitle: "Plan your ride",
  placeTitleFrom: "Where are you starting?",
  placeDescFrom: "We guessed from your connection — change it if we got it wrong.",
  placeTitleTo: "Where are you headed?",
  placeDescTo: "Pick a town, or tap a route to fill both ends at once.",
  placeInputFrom: "Leaving from…",
  placeInputTo: "Going to…",
  sectionPopular: "Popular right now",
  sectionNear: "Near you",
  sectionRecent: "Where you've been looking",
  sectionAll: "Towns across Kenya",
  sectionResults: "Matches",
  noMatch: (q: string) => `No town called "${q}". Try the county instead.`,

  whenTitle: "When are you travelling?",
  whenDesc: "Leave it on \"now\" and we'll show everything coming up.",

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
  emptyAlertsBody: "Nothing reported on these roads yet. Post an alert if you see something.",

  errorTitle: "That didn't load",
  errorBody: "Check your connection and try again.",
  retry: "Try again",
  notOnMap: "Not on the map",
} as const;
