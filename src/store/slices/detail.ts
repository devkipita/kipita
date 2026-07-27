import { create } from "zustand";
import type { Trip, RideRequest, Alert, User } from "@/types";

/**
 * Holds the entity being viewed on a full-page detail route.
 *
 * Router params can only carry strings, and refetching a joined Trip/Alert by id
 * from a route is wasteful when we already hold the object. We stash it here and
 * the route reads it by id — same pattern the sheet payload uses.
 */
interface DetailState {
  trips: Record<string, Trip>;
  requests: Record<string, RideRequest>;
  alerts: Record<string, Alert>;
  people: Record<string, User>;
  /** Person shown on a ride route, keyed to the ride id (driver or passenger). */
  setTrip: (trip: Trip) => void;
  setRequest: (request: RideRequest) => void;
  setAlert: (alert: Alert) => void;
  setPerson: (person: User) => void;
}

export const useDetailStore = create<DetailState>((set) => ({
  trips: {},
  requests: {},
  alerts: {},
  people: {},
  setTrip: (trip) => set((s) => ({ trips: { ...s.trips, [trip.id]: trip } })),
  setRequest: (request) =>
    set((s) => ({ requests: { ...s.requests, [request.id]: request } })),
  setAlert: (alert) => set((s) => ({ alerts: { ...s.alerts, [alert.id]: alert } })),
  setPerson: (person) =>
    set((s) => ({ people: { ...s.people, [person.id]: person } })),
}));
