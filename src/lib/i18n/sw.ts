import type { TranslationKey } from './en';

export const sw: Record<TranslationKey, string> = {
  // Common
  app_name: 'Kipita',
  ok: 'Sawa',
  cancel: 'Ghairi',
  done: 'Imekamilika',
  save: 'Hifadhi',
  edit: 'Hariri',
  delete: 'Futa',
  retry: 'Jaribu tena',
  back: 'Rudi',
  close: 'Funga',
  search: 'Tafuta',
  loading: 'Inapakia...',
  send: 'Tuma',
  share: 'Shiriki',
  confirm: 'Thibitisha',
  continue: 'Endelea',
  skip: 'Ruka',

  // Mode
  get_ride: 'Pata Safari',
  offer_ride: 'Toa Safari',
  switch_mode: 'Badilisha Hali',
  passenger: 'Abiria',
  driver: 'Dereva',

  // Nav
  home: 'Nyumbani',
  trips: 'Safari',
  alerts: 'Tahadhari',
  profile: 'Wasifu',

  // Auth
  sign_in: 'Ingia',
  sign_up: 'Jisajili',
  sign_out: 'Ondoka',
  phone_number: 'Nambari ya Simu',
  enter_phone: 'Weka nambari yako ya simu',
  enter_otp: 'Weka msimbo wa uthibitisho',
  send_code: 'Tuma Msimbo',
  verify: 'Thibitisha',
  email: 'Barua pepe',
  password: 'Nenosiri',
  continue_with_google: 'Endelea na Google',
  or: 'au',
  welcome_back: 'Karibu tena',
  create_account: 'Fungua akaunti',

  // Route Search
  from: 'Kutoka',
  to: 'Kwenda',
  from_placeholder: 'Unaondoka wapi...',
  to_placeholder: 'Unaenda wapi...',
  search_rides: 'Tafuta Safari',
  search_requests: 'Tafuta Maombi',
  advanced_options: 'Chaguo Zaidi',
  leave_now: 'Ondoka sasa',
  later: 'Baadaye',
  schedule: 'Ratiba',
  when: 'Lini',
  date: 'Tarehe',
  departure_time: 'Saa ya Kuondoka',
  ride_preferences: 'Mapendeleo ya Safari',
  accepted_options: 'Chaguo Zinazokubaliwa',
  luggage: 'Mizigo',
  pets: 'Wanyama',
  silent_ride: 'Safari Kimya',
  music: 'Muziki',

  // Home
  available_rides: 'Safari Zinazopatikana',
  available_requests: 'Maombi ya Abiria',
  road_alerts: 'Tahadhari za Barabara',
  see_all: 'Ona Zote',
  read_more: 'Soma zaidi',

  // Trips
  current: 'Sasa',
  previous: 'Zilizopita',
  incoming_requests: 'Zinazokuja',
  no_rides_yet: 'Hakuna safari bado',
  no_trips_yet: 'Hakuna safari bado',
  no_rides_found: 'Hakuna safari zilizopatikana',
  no_requests_found: 'Hakuna maombi yaliyopatikana',
  request_posted: 'Ombi limetumwa! Tutawajulisha madereva wanaolingana.',
  ride_posted: 'Safari imetumwa! Abiria watakupata.',
  post_request: 'Tuma Ombi',
  post_ride: 'Tuma Safari',

  // Trip details
  seats: 'Viti',
  seats_available: 'viti vinapatikana',
  price_per_seat: 'kwa kiti',
  departure: 'Kuondoka',
  message: 'Ujumbe',
  match: 'Linganisha',
  request_match: 'Omba Safari',
  accept_request: 'Kubali Ombi',
  start_trip: 'Anza Safari',
  end_trip: 'Maliza Safari',
  cancel_trip: 'Ghairi Safari',

  // Person
  verified: 'Amethibitishwa',
  unverified: 'Hajathibitishwa',
  rating: 'Kiwango',
  total_trips: 'Safari',
  call: 'Piga simu',

  // Payment
  payment: 'Malipo',
  pay_now: 'Lipa Sasa',
  mpesa: 'M-Pesa',
  card: 'Kadi',
  check_your_phone: 'Angalia simu yako kwa M-Pesa',
  payment_success: 'Malipo yamefanikiwa!',
  payment_failed: 'Malipo yameshindikana. Jaribu tena.',
  total: 'Jumla',

  // Alerts
  system_alerts: 'Mfumo',
  notifications: 'Arifa',
  road_alerts_tab: 'Tahadhari',
  post_alert: 'Tuma Tahadhari',
  alert_location: 'Mahali',
  alert_category: 'Aina',
  alert_content: 'Kinachoendelea?',
  react: 'Jibu',
  comment: 'Maoni',
  comments: 'Maoni',
  write_comment: 'Andika maoni...',

  // Alert categories
  traffic: 'Msongamano',
  accident: 'Ajali',
  road_closure: 'Barabara Imefungwa',
  weather: 'Hali ya Hewa',
  police: 'Polisi',
  general: 'Kawaida',

  // Chat
  type_message: 'Andika ujumbe...',
  no_messages: 'Hakuna ujumbe bado',

  // Profile
  edit_profile: 'Hariri Wasifu',
  full_name: 'Jina Kamili',
  settings: 'Mipangilio',
  theme: 'Mandhari',
  language: 'Lugha',
  light: 'Mwanga',
  dark: 'Giza',
  system_theme: 'Mfumo',
  english: 'Kiingereza',
  swahili: 'Kiswahili',
  verification: 'Uthibitisho',
  terms: 'Masharti ya Huduma',
  privacy: 'Sera ya Faragha',
  cookies: 'Sera ya Kuki',
  about: 'Kuhusu Kipita',
  version: 'Toleo',
  contact_support: 'Wasiliana na Msaada',

  // Empty states
  empty_trips: 'Safari zako zitaonekana hapa',
  empty_alerts: 'Hakuna tahadhari kwenye eneo lako',
  empty_notifications: 'Umesoma zote',
  empty_results: 'Hakuna matokeo',
  empty_chat: 'Sema habari!',

  // Errors
  error_generic: 'Kuna tatizo fulani',
  error_network: 'Angalia mtandao wako',
  error_offline: 'Huna mtandao',

  // Notifications
  new_match: 'Mechi Mpya',
  trip_confirmed: 'Safari Imethibitishwa',
  new_message: 'Ujumbe Mpya',
};
