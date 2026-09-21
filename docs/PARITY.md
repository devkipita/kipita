# Kipita — mobile / web parity

What works on each platform, and what only looks like it works. Written against the
code, not the roadmap: every "no" below was verified by reading the source or the
migrations.

Audited 2026-09-21, revised 2026-09-22. Update this file when a row changes.

Legend: **Yes** — works end to end · **Partial** — ships but with a caveat in the notes ·
**No** — not built · **Broken** — present in the UI but does not do what it appears to.

> ## ⚠ The live database is at migration 001 — everything since is unapplied
>
> Probed `ipaqkfykfibycyqsmfsy` directly on 2026-09-22 with the publishable key.
> `users`, `rides`, `ride_requests` and `bookings` exist. **`trips`, `cities`,
> `trip_stops`, `saved_places`, `reports`, `comment_likes`, `wallet_transactions`,
> `refund_requests`, `waitlist`, `faqs`, `promotions` and `route_interests` all
> return 404** — PostgREST even hints "perhaps you meant `public.rides`", which is
> the pre-003 name.
>
> So migrations **003 through 020 have never run**. Until `supabase db push`
> happens, nothing that touches the trip model works on either platform: ride
> search, ride detail, seat reservation and M-Pesa all query `trips`, and
> `bookings` still has `ride_id` rather than `trip_id`. The application code in
> this repo is written against the intended schema and is correct; the database is
> simply behind it.
>
> The CLI here cannot push — it needs `SUPABASE_DB_PASSWORD`. Every row in the
> tables below describes intended behaviour against the migrated schema.

> **Migrations 018–020 are written but not applied.** They add the `promotions`
> table, the `alert-media` storage bucket, and route-targeted broadcasts. Until
> `supabase db push` runs, the offers band stays hidden, alert photo uploads fail,
> and new posts still notify every active user. Migrations 013, 015 and 017 have
> also historically lagged — check they land too. Migration 013 in particular gates
> escrow, so web M-Pesa needs it applied before it can hold funds.
>
> **The Daraja secrets must be set on the edge functions** (`MPESA_CONSUMER_KEY`,
> `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`,
> and `MPESA_BASE_URL` for production rather than sandbox), or `initiate-payment`
> throws and the web checkout reports that it couldn't reach M-Pesa.

---

## Ride discovery & posting

| Capability | Mobile | Web | Notes |
|---|---|---|---|
| Route search | Yes | Yes | Mobile persists the draft to MMKV and IP-detects the origin town. Web detects the town per session. |
| Available rides (passenger view) | Yes | Yes | |
| Passenger requests (driver view) | Yes | Yes | |
| Post a trip | Yes | Yes | |
| Post a ride request | Yes | Yes | |
| Post form opens on an empty search | Yes | Yes | The core loop: a search that finds nothing becomes a new post. |
| Ride detail | Yes | Yes | |
| Reserve a seat | **Broken** | Yes | See the booking-row note below — mobile never inserts a `bookings` row, web does. |
| Pay with M-Pesa | **Broken in practice** | Yes | Both call the same Daraja backend. Mobile's wiring is real but unreachable; web's works end to end. See below. |
| Escrow release to driver | Yes | — | `releaseEscrow` runs when the driver ends the ride. Driver-side is app-only. |
| Register a vehicle | **No** | **No** | No CRUD and no UI on either platform, so every trip is created with `vehicle_id = NULL`. Car make/model/plate on a ride card only ever comes from mobile's seed data. |
| Origin / destination city ids | **No** | **No** | `cities` is seeded and joined, but nothing sets `origin_city_id` / `destination_city_id`. Routing is free-text `ilike` matching. |

### M-Pesa, precisely

The backend is real on both platforms and shared: `initiate-payment` fires a Daraja
STK push, Safaricom calls `mpesa-callback`, that flips the `payments` row to
`completed` (funds in escrow) or `failed`, and `release-escrow` pays the driver out
minus the 12% fee in `@kipita/shared`.

**Mobile's client is wired but unreachable.** `SheetOrchestrator.handlePay` really
does call `initiatePayment` + `pollPaymentStatus` — the older note that it
hardcoded `onPay={async () => true}` is out of date. The problem is upstream:
`createBooking` in `lib/api/bookings.ts` is **never called from anywhere**.
`app/ride/[id].tsx` builds a booking object in memory with the id `temp-<tripId>`,
and `handlePay` then checks `/^[0-9a-f-]{36}$/` and short-circuits any non-UUID to
a fake 1.4-second success. So every payment started from the mobile ride screen
resolves "paid" without a booking row and without charging anyone.

**Web is the path that actually works.** `reserveSeatAction` inserts a real
`bookings` row, so the UUID is genuine, and `PaymentDrawer` drives the same edge
functions: phone entry → STK push → poll → confirmed / failed / still-waiting.

Fixing mobile is small: call `createBooking` before opening the payment sheet, and
drop the `temp-` short-circuit.

## Road alerts

| Capability | Mobile | Web | Notes |
|---|---|---|---|
| Feed | Yes | Yes | Web: preview band on `/home`, full feed at `/alerts`. |
| Post an alert | Yes | Yes | |
| React (4 emoji) | Yes | Yes | |
| Comment | Yes | Yes | |
| Like a comment | Yes | Yes | |
| Your own reaction survives a reload | **Broken** | Yes | Mobile's `ALERT_SELECT` never fetches `user_reaction`, so the heart resets on every reload. Web resolves it with a second scoped query. |
| Attach a photo | **Broken** | Yes | Mobile writes the local device URI (`file:///…`) into `image_url`, so nobody else can load it — flagged in `AlertPostSheet.tsx` itself. Web uploads to the `alert-media` bucket. Both feeds filter non-`http(s)` URLs so mobile's rows degrade to text cards. |
| View count | **Broken** | — | No `views_count` column and no `alert_views` table exist. Mobile renders the number anyway and `fetchAlertViewers` falls back to invented people. Web omits views entirely. |
| Edit / delete an alert | **No** | **No** | `announcements` and `alert_comments` have no UPDATE or DELETE policy. Nothing can remove an alert from any client. |
| Live feed | **No** | **No** | `announcements` is not in the `supabase_realtime` publication (only `messages`, `notifications`, `bookings`, `trips`, `wallet_transactions` are). |
| Mock fallback masks failures | **Yes** | No | `fetchAlerts` returns seed data on *error* as well as on empty, so an RLS failure renders as a healthy feed. Web surfaces real empty and error states. |

## Roles & driver

| Capability | Mobile | Web | Notes |
|---|---|---|---|
| Passenger / driver mode | Yes | Yes | Mobile stores it in MMKV; web in the `kipita-mode` cookie. Neither writes it to the database — there is no role column on `public.users`. |
| Where the toggle lives | Profile screen | `/home` | |
| Driver KYC | Yes | Yes | |
| KYC gate on driver mode | Partial | Partial | The gate is "has submitted", not "is approved" (`approval_status !== 'not_submitted'`). Mobile's `useAppMode().toggle` bypasses the gate entirely; the splash screen sets the mode directly with no sign-in. |
| Server-side enforcement that a driver is a driver | **No** | **No** | `trips` INSERT only checks `driver_id = me`. Nothing consults `driver_profiles`. Any authenticated client can post a trip. `driver_profiles` RLS is `FOR ALL USING (own row)`, so a client can also write its own `approval_status`. |

## Notifications

| Capability | Mobile | Web | Notes |
|---|---|---|---|
| In-app inbox | Yes | Yes | |
| Live arrival | Yes | Partial | Mobile gets an Expo push. Web subscribes over Realtime and raises an OS notification only while a tab is open. |
| Background push | Partial | **No** | Mobile needs an EAS `projectId` and a native rebuild before tokens register. Web needs a service worker + VAPID; the migration-007 trigger only speaks the Expo push API. |
| Broadcast audience | Targeted | Targeted | Rewritten from "every active user" to people with a matching open request, posted trip, or recent search. |
| Contributes route interest on search | **No** | Yes | Mobile does not write `route_interests`, so its searches do not attract notifications yet. |
| Tapping an alert notification opens it | Yes | Yes | |
| Tapping a booking / chat notification | Yes | **No** | Web has no booking detail or chat screen, so those rows mark read and stay put. |

## Chat

| Capability | Mobile | Web | Notes |
|---|---|---|---|
| Conversations + messages | Yes | **No** | Realtime, outbox and media upload all work on mobile. Web has no chat at all, which is why "respond to this request" on web sends you to the app. |

## Offers

| Capability | Mobile | Web | Notes |
|---|---|---|---|
| Offers / gift cards band | Static | Yes | Web reads the `promotions` table. Mobile's Trips tab shows three hard-coded cards (invite, off-peak, verification) — real copy, no backend. |
| "Why kipita.co.ke" cards | Yes | **No** | Mobile-only, static, on the Trips tab. |
| Admin editor | — | Yes | `/admin/promotions`. |
| Redeeming an offer | — | **No** | Display-only on both. Web now has a payment surface, so redemption is newly *possible* — it still needs a redemptions ledger and server-side price authority. |

## Admin

| Capability | Web | Notes |
|---|---|---|
| Refund queue | Yes | `/admin/refunds`, calls the `resolve-refund` edge function. |
| FAQ editor | Yes | `/admin/faq`. |
| Promotions editor | Yes | `/admin/promotions`. |
| Alert moderation | **No** | Impossible from any client — no DELETE policy on `announcements`. |

---

## Mobile UI, revised 2026-09-22

| Capability | Status | Notes |
|---|---|---|
| Inputs zoom the page on iPhone | **Fixed** | Every text field was 14px; iOS auto-zooms anything under 16px when focused, which is what wrecked the layout in the web build. A `typography.input` token (16px) now covers all eight text-entry surfaces. |
| `+html.tsx` anti-zoom CSS | **Inert** | Expo only renders it when `web.output` is `"static"`; in SPA mode it serves its own template. Kept as a safety net, comment corrected. |
| Home "swipe up to see all alerts" | **Fixed** | `PanResponder` was attached to a `Pressable` and lost responder negotiation, so it never fired. Now `Gesture.Pan` from gesture-handler. |
| Bottom tab bar | Redesigned | 58px, icon over label, one-word labels always visible. |
| Top bar | Redesigned | Brand on the left in normal flow (it was an absolute overlay that sat under the bell), theme/profile pill on the right; hidden on home, alerts and trips, which own their headers. |
| Alerts screen | Redesigned | Own header + back arrow, search that collapses on scroll, thin filter chips. Removed a `TEMP(testing)` hack that forced every notification to render unread. |
| Post Alert sheet | Redesigned | Was reusing the chat `Composer`. Now a real form: category chips, location, multiline body with counter, photo, Post button. |
| Trips screen | Redesigned | Header/search/chips, photo-hero tickets, Offers and "Why kipita.co.ke" carousels with section headings. |
| Destination photos on tickets | Yes | Wikipedia `pageimages` at 800px, cached in MMKV for 30 days. All ten seeded towns return a real photo (Kericho returns a map rather than a street scene). Gradient + monogram fallback while loading or when there's no image. |
| `yarn typecheck` (mobile) | **Failing** | 43 pre-existing errors, surfaced by the TypeScript 5.9 → 6.0 upgrade: the Supabase client is untyped so every `insert`/`update` payload is `never`, plus `StyleSheet.create` union issues. Unrelated to the UI work; `expo export` succeeds. |

## Where things live on the web

| Surface | Route |
|---|---|
| Signed-in home (search, rides, offers, alerts preview) | `/home` — where sign-in now lands |
| Road alerts feed / one alert | `/alerts`, `/alerts/[id]` |
| A trip or ride request, and M-Pesa checkout | `/ride/[id]` (`?kind=request` for a request) |
| Notification inbox | `/notifications` |
| Offers editor | `/admin/promotions` |

The passenger/driver toggle is on `/home` and is stored in the `kipita-mode`
cookie. It is a UI preference, never an authorization signal: posting a trip
re-checks `driver_profiles` server-side, and RLS pins `driver_id` to the caller
regardless of what the cookie says.

## Backend notes worth knowing

- **Migration state.** Several migrations have historically lagged behind the code. Check
  `013` (payment escrow), `015` (waitlist) and `017` (FAQs) are applied — the waitlist form
  and the FAQ page fail silently until they are.
- **Mock fallbacks hide RLS errors.** Mobile's `fetchAlerts`, `fetchTrips`, `fetchRequests`
  and `fetchNotifications` all substitute seed data when a query *errors*, not just when it
  returns nothing. Migration `012` exists because exactly this class of 403 went unnoticed.
  Web deliberately does not do this.
- **`users.id` vs `auth_id`.** Every foreign key uses `users.id`. `auth_id` is only ever a
  lookup key. `getProfile()` on web can return a synthesized profile whose `id` is the auth
  id when the `users` row is missing, so writes resolve `users.id` server-side rather than
  trusting the client.
- **Free-text route matching.** `from_location` / `to_location` are matched with unanchored
  `ilike '%…%'`, which no index can serve. Fine at current volume; `pg_trgm` is the fix.
- **Storage paths use `users.id`, not `auth_id`.** Every bucket policy compares the first
  path segment to `current_app_user_id()`, which resolves to `users.id`. Uploading under
  the auth id is silently rejected by RLS — that is the bug migration 011 was written to
  fix for chat media, and the web avatar uploader had the same mistake until 2026-09-21.
- **Driver KYC is self-asserted.** `driver_profiles` RLS is `FOR ALL USING (own row)` with
  no column restriction, so a client can write its own `approval_status`. Combined with
  the missing driver check on `trips`, "verified driver" currently means nothing on the
  server. Worth an admin review screen and a tightened policy before launch.
