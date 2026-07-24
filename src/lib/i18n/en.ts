export const en = {
  // Common
  app_name: 'Kipita',
  ok: 'OK',
  cancel: 'Cancel',
  done: 'Done',
  save: 'Save',
  edit: 'Edit',
  delete: 'Delete',
  retry: 'Retry',
  back: 'Back',
  close: 'Close',
  search: 'Search',
  loading: 'Loading...',
  send: 'Send',
  share: 'Share',
  confirm: 'Confirm',
  continue: 'Continue',
  skip: 'Skip',

  // Mode
  get_ride: 'Get a Ride',
  offer_ride: 'Offer a Ride',
  switch_mode: 'Switch Mode',
  passenger: 'Passenger',
  driver: 'Driver',

  // Nav
  home: 'Home',
  trips: 'Trips',
  alerts: 'Alerts',
  profile: 'Profile',

  // Auth
  sign_in: 'Sign In',
  sign_up: 'Sign Up',
  sign_out: 'Sign Out',
  phone_number: 'Phone Number',
  enter_phone: 'Enter your phone number',
  enter_otp: 'Enter verification code',
  send_code: 'Send Code',
  verify: 'Verify',
  email: 'Email',
  password: 'Password',
  continue_with_google: 'Continue with Google',
  or: 'or',
  welcome_back: 'Welcome back',
  create_account: 'Create your account',

  // Route Search
  from: 'From',
  to: 'To',
  from_placeholder: 'Leaving from...',
  to_placeholder: 'Going to...',
  search_rides: 'Search Rides',
  search_requests: 'Search Requests',
  advanced_options: 'More Options',
  date: 'Date',
  departure_time: 'Departure Time',
  ride_preferences: 'Ride Preferences',
  accepted_options: 'Accepted Options',
  luggage: 'Luggage',
  pets: 'Pets',
  silent_ride: 'Silent Ride',
  music: 'Music',

  // Home
  available_rides: 'Available Rides',
  available_requests: 'Passenger Requests',
  road_alerts: 'Road Alerts',
  see_all: 'See All',

  // Trips
  current: 'Current',
  previous: 'Previous',
  incoming_requests: 'Incoming',
  no_rides_yet: 'No rides yet',
  no_trips_yet: 'No trips yet',
  no_rides_found: 'No rides found',
  no_requests_found: 'No requests found',
  request_posted: 'Request posted! We\'ll notify matching drivers.',
  ride_posted: 'Ride posted! Passengers will find you.',
  post_request: 'Post Request',
  post_ride: 'Post Ride',

  // Trip details
  seats: 'Seats',
  seats_available: 'seats available',
  price_per_seat: 'per seat',
  departure: 'Departure',
  message: 'Message',
  match: 'Match',
  request_match: 'Request Ride',
  accept_request: 'Accept Request',
  start_trip: 'Start Trip',
  end_trip: 'End Trip',
  cancel_trip: 'Cancel Trip',

  // Person
  verified: 'Verified',
  unverified: 'Not Verified',
  rating: 'Rating',
  total_trips: 'Trips',
  call: 'Call',

  // Payment
  payment: 'Payment',
  pay_now: 'Pay Now',
  mpesa: 'M-Pesa',
  card: 'Card',
  check_your_phone: 'Check your phone for the M-Pesa prompt',
  payment_success: 'Payment successful!',
  payment_failed: 'Payment failed. Please try again.',
  total: 'Total',

  // Alerts
  system_alerts: 'System',
  notifications: 'Notifications',
  road_alerts_tab: 'Alerts',
  post_alert: 'Post Alert',
  alert_location: 'Location',
  alert_category: 'Category',
  alert_content: 'What\'s happening?',
  react: 'React',
  comment: 'Comment',
  comments: 'Comments',
  write_comment: 'Write a comment...',

  // Alert categories
  traffic: 'Traffic',
  accident: 'Accident',
  road_closure: 'Road Closure',
  weather: 'Weather',
  police: 'Police',
  general: 'General',

  // Chat
  type_message: 'Type a message...',
  no_messages: 'No messages yet',

  // Profile
  edit_profile: 'Edit Profile',
  full_name: 'Full Name',
  settings: 'Settings',
  theme: 'Theme',
  language: 'Language',
  light: 'Light',
  dark: 'Dark',
  system_theme: 'System',
  english: 'English',
  swahili: 'Swahili',
  verification: 'Verification',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy',
  about: 'About Kipita',
  version: 'Version',
  contact_support: 'Contact Support',

  // Empty states
  empty_trips: 'Your trips will appear here',
  empty_alerts: 'No alerts in your area',
  empty_notifications: 'You\'re all caught up',
  empty_results: 'No results found',
  empty_chat: 'Say hello!',

  // Errors
  error_generic: 'Something went wrong',
  error_network: 'Check your connection',
  error_offline: 'You\'re offline',

  // Notifications
  new_match: 'New Match',
  trip_confirmed: 'Trip Confirmed',
  new_message: 'New Message',
} as const;

export type TranslationKey = keyof typeof en;
