/** Centralized TanStack Query key factory */
export const queryKeys = {
  // Auth / User
  profile: (userId: string) => ["profile", userId] as const,
  currentUser: () => ["currentUser"] as const,

  // Trips
  trips: {
    all: () => ["trips"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["trips", "list", filters] as const,
    detail: (id: string) => ["trips", "detail", id] as const,
    search: (
      from: string,
      to: string,
      date?: string | null,
      departureTime?: string | null,
    ) =>
      [
        "trips",
        "search",
        from,
        to,
        date ?? null,
        departureTime ?? null,
      ] as const,
  },

  // Ride requests
  requests: {
    all: () => ["requests"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["requests", "list", filters] as const,
    detail: (id: string) => ["requests", "detail", id] as const,
    search: (
      from: string,
      to: string,
      date?: string | null,
      departureTime?: string | null,
    ) =>
      [
        "requests",
        "search",
        from,
        to,
        date ?? null,
        departureTime ?? null,
      ] as const,
  },

  // Bookings / Trips
  bookings: {
    all: () => ["bookings"] as const,
    current: (userId: string) => ["bookings", "current", userId] as const,
    previous: (userId: string) => ["bookings", "previous", userId] as const,
    incoming: (driverId: string) => ["bookings", "incoming", driverId] as const,
    detail: (id: string) => ["bookings", "detail", id] as const,
  },

  // Alerts
  alerts: {
    all: () => ["alerts"] as const,
    feed: (page?: number) => ["alerts", "feed", page] as const,
    detail: (id: string) => ["alerts", "detail", id] as const,
    comments: (alertId: string) => ["alerts", "comments", alertId] as const,
    preview: () => ["alerts", "preview"] as const,
    viewers: (alertId: string) => ["alerts", "viewers", alertId] as const,
    reactors: (alertId: string) => ["alerts", "reactors", alertId] as const,
  },

  // Notifications
  notifications: {
    all: () => ["notifications"] as const,
    list: () => ["notifications", "list"] as const,
    unreadCount: () => ["notifications", "unreadCount"] as const,
  },

  // Messages
  conversations: {
    all: () => ["conversations"] as const,
    list: () => ["conversations", "list"] as const,
    messages: (conversationId: string) =>
      ["conversations", "messages", conversationId] as const,
  },

  // Payments
  payments: {
    detail: (id: string) => ["payments", id] as const,
    status: (id: string) => ["payments", "status", id] as const,
  },

  // Ratings
  ratings: {
    forUser: (userId: string) => ["ratings", userId] as const,
  },

  // Towns (static, cached forever)
  towns: () => ["towns"] as const,
} as const;
