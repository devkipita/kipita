# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two sides of one Kenyan road network.

**Drivers (the primary user of `/publish`):** people already making a journey between Kenyan towns — Nairobi to Nakuru, Kisumu, Mombasa, Eldoret, Nyeri, Thika — who have empty seats. Confirmed by the user: a mix of commuters driving their own route anyway and regular earners who run a corridor often, and the page is designed for the commuter's speed first with the earnings picture visible but secondary. They publish from a phone, mostly: thumb reach, outdoors, daylight, often parked or about to leave. Desktop is the minority case and should read as the generous version of the same thing, not a different product.

**Passengers:** people searching a route and a day, booking a seat, paying through M-Pesa, and meeting the driver at a pickup point.

## Product Purpose

Kipita matches empty seats to people travelling the same road, and holds the money until the journey is done. Success for a driver is a published ride that fills; success for a passenger is a seat on a real car with a real plate at a time they can rely on.

## Positioning

Not a taxi dispatch and not a matatu booking site: the journey already exists, and Kipita sells the seats that would otherwise travel empty. Money is held in escrow and released to the driver after the journey, minus the platform fee, which is what makes a stranger's car a safe transaction on both sides.

## Operating Context

- Routes are town-to-town corridors; passengers search by route and day, so the two town names are the ride's primary identity.
- Fares are per seat, in KES, set by the driver. Current preset ladder on `/publish`: 500 / 800 / 1,200 / 1,600 / 2,000.
- A ride carries: origin, destination, departure date, departure time, seats offered (1–8), fare per seat, optional vehicle make / model / number plate, and preference flags (luggage, pets, silent, music, no smoking).
- The number plate is how a passenger finds the car at the kerb. The driver's exact address stays private until a booking is confirmed.
- Payment runs on an M-Pesa escrow model with a wallet ledger; booking currently stops at `pending_payment` on web.
- Related surfaces already built: `/home` (signed-in hub), ride search and results, `/ride/[id]` detail, trips, wallet, referrals, road alerts, driver KYC, support.
- Apps: `apps/mobile` (Expo) and `apps/web` (Next.js App Router, styled-components, Supabase). `packages/shared` holds common code.

## Capabilities and Constraints

- Publishing writes a trip through `createTripAction`; the driver must have a profile (`requireProfile`).
- Vehicle details are optional, but make, model and plate are only accepted together.
- A ride cannot depart in the past.
- Web has no push notifications (Expo-only); the web surface relies on realtime in-app notification.
- Time is stored as 24-hour `HH:MM` and an ISO date; the UI may present 12-hour Kenyan English.
- Theming is token-driven (`nocturne`), with both a light and a dark set already in use across the app.
- Undecided: whether recurring / repeating rides, multi-stop routes, or seat-level pricing ever land on this page.

## Brand Commitments

- Name and wordmark: Kipita. Tagline in the logo lockup: "Ride. Share. Connect."
- The existing colour world is binding: deep green grounds, cream / off-white page ground, lime and sage greens, and a single orange used for the primary action.
- No emoji anywhere in the product; icons come from the in-house set in `components/icons`.
- Voice: plain Kenyan English, second person, no hype. Money is always written `KES 1,200`.

## Evidence on Hand

- Real route and town data (`/api/places`, popular corridors with editorial blurbs such as "Up the escarpment").
- Real fares, seat counts and vehicle fields as above.
- No customer testimonials, no press, no ratings volume, no business statistics. These must not be invented on any surface.

## Product Principles

1. The journey is the driver's, not the platform's — the product fits around a trip that is happening anyway.
2. Money is explicit: what a passenger pays, what a driver earns, and when it arrives.
3. A ride is only as good as its specifics — two towns, a real time, a real plate.
4. Phone-first, outdoors, in a hurry; anything that needs a careful read has already failed.
5. Nothing is claimed that the platform cannot prove.

## Accessibility & Inclusion

WCAG 2.2 AA is the working standard for the web app, confirmed by the user raising contrast and keyboard-operability failures on `/publish` directly. Controls must be operable by keyboard and by thumb, with visible focus and real labels, and must not depend on scroll gestures to commit a value.
