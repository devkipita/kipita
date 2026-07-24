import type { AppMode, RidePreferences } from '@/types';

/** Role-specific configuration — one object drives all label/CTA/endpoint differences */
export const ROLE_CONFIG = {
  passenger: {
    label: 'passenger',
    modeTitle: 'get_ride',
    searchCTA: 'search_rides',
    emptyTrips: 'no_rides_yet',
    emptyResults: 'no_rides_found',
    homeCarouselTitle: 'available_rides',
    tripsTabExtra: null,
    preferencesLabel: 'ride_preferences',
    postAction: 'post_request',
    matchAction: 'request_match',
  },
  driver: {
    label: 'driver',
    modeTitle: 'offer_ride',
    searchCTA: 'search_requests',
    emptyTrips: 'no_trips_yet',
    emptyResults: 'no_requests_found',
    homeCarouselTitle: 'available_requests',
    tripsTabExtra: 'incoming_requests',
    preferencesLabel: 'accepted_options',
    postAction: 'post_ride',
    matchAction: 'accept_request',
  },
} as const satisfies Record<AppMode, Record<string, string | null>>;

export const DEFAULT_PREFERENCES: RidePreferences = {
  luggage: false,
  pets: false,
  silent_ride: false,
  music: false,
};

export const QUERY_STALE_TIMES = {
  profile: 5 * 60 * 1000,
  rides: 30 * 1000,
  requests: 30 * 1000,
  trips: 60 * 1000,
  alerts: 60 * 1000,
  notifications: 30 * 1000,
  conversations: 15 * 1000,
  towns: Infinity,
} as const;

export const DEBOUNCE_MS = 300;

export const KENYAN_CURRENCY = 'KES';
export const MPESA_DISPLAY = 'M-Pesa';

export const APP_NAME = 'Kipita';
export const APP_VERSION = '1.0.0';
export const SUPPORT_EMAIL = 'support@kipita.co.ke';

/** External links surfaced from Settings */
export const WEBSITE_URL = 'https://kipita.co.ke';
export const TERMS_URL = 'https://kipita.co.ke/terms';
export const PRIVACY_URL = 'https://kipita.co.ke/privacy';
export const COOKIES_URL = 'https://kipita.co.ke/cookies';
export const RATE_URL = 'https://kipita.co.ke/rate';

export const MAX_SEATS = 8;
export const MIN_SEATS = 1;

export const ALERT_CATEGORIES = [
  'traffic',
  'accident',
  'road_closure',
  'weather',
  'police',
  'general',
] as const;

export const DEEP_LINK_PREFIX = 'kipita://';
