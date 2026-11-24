# Kipita web — launch status

The single status document for the web launch. It replaces `docs/PARITY.md`. `docs/AUDIT-2026-11.md` and `docs/LAUNCH-DECEMBER.md` are kept as history and are no longer current.

**Last verified:** 17 November 2026, against the code, all 53 migrations and all 10 edge functions.
**Scope:** `apps/web` and the shared Supabase backend. Mobile is a separate Kotlin project.

## Shape

| Milestone | Date | What it means |
|---|---|---|
| Go / no-go | Wed 2 Dec 2026, 17:00 | Every pilot gate below is `done` |
| Private pilot opens | Thu 3 Dec 2026 | Invite-only. Nairobi–Nakuru plus one corridor, about 25 drivers, real M-Pesa |
| Feature freeze | 18 Dec – 4 Jan | Fixes only |
| Public GA | Tue 19 Jan 2027 | Every GA gate below is `done` |

**Decisions (17 Nov 2026):** pilot before GA. Wallet, top-up, withdrawal and escrow all ship on. The design system in `docs/design/kipita-design-system.html` is binding.

**Accepted risk, owned by the CEO:** holding and paying out customer money may bring Central Bank payment-service rules into play. Counsel's memo is a GA gate.

**The one external clock:** Safaricom Daraja production go-live, C2B and B2C. If it is not live by Fri 27 Nov, the pilot date moves day for day.

## Pilot gates

| ID | Gate | Owner | Status | Evidence |
|---|---|---|---|---|
| S1 | RLS on `phone_verifications` and `trip_confirmations` | Eng | open | `001_initial_schema.sql:285,298` have no RLS |
| S2 | `deduct_seats` and `increment_trip_count` not callable by clients; `search_path` set on legacy definers | Eng | open | `003:297`, `002:2` |
| S3 | Demo trips from migrations 031 and 033 removed from prod; seeds out of the chain | Eng | open | `031:21-58`, `033:95` |
| S4 | Escrow released only for completed bookings, by the server | Eng | open | `release-escrow/index.ts:92` checks caller only |
| S5 | Payment landing on an expired hold is refunded | Eng | open | `confirm-payment/index.ts:107-120` |
| S6 | No invented drivers on search errors | Eng | open | `apps/web/lib/rides.ts:70-93` |
| S7 | Unpaid holds expire on a schedule | Eng | open | `expire_stale_bookings()` (`034:141`) never called |
| S8 | B2C result handler; payouts are `paid` only on the result | Eng | open | `withdraw-wallet:110-117`, `release-escrow:170-175` |
| S9 | Staging project, `supabase/config.toml`, live migration ground truth recorded below | Eng | open | no `config.toml` in repo |
| S10 | Migration 053 live before the trip journey code ships | Eng | open | `lib/trips/types.ts:110-117` |
| P1 | Callback idempotency, amount and `CheckoutRequestID` match | Eng | open | `confirm-payment:131`, `mpesa-callback:79` |
| P2 | Withdrawals pay only the verified phone | Eng | open | `withdraw-wallet:42` |
| P3 | anon cannot read `date_of_birth`, `gender`, `is_admin` | Eng | open | `004:91-102`, `014:19` |
| O1 | Daraja production C2B and B2C credentials set on prod functions | Dennis | open | `MPESA_BASE_URL` defaults to sandbox |
| O2 | Sentry receiving from web; `global-error.tsx` | Dennis | in progress | SDK, boundaries and `/monitoring` tunnel wired; needs a Sentry project and `NEXT_PUBLIC_SENTRY_DSN` |
| O3 | CI green: typecheck, lint, design-check, build | Dennis | in progress | `.github/workflows/web.yml` green locally; needs repo secrets for Supabase URL, anon key, Maps key, Sentry DSN |
| O4 | Pilot invite gate (`pilot_invite_only` flag) | Eng | open | — |
| O5 | Speed budgets met on `/`, `/home`, `/ride/[id]` | Eng | open | see Budgets |
| O6 | Five internal rides end to end on real M-Pesa | Dennis | open | — |
| L1 | Counsel memo on wallet and escrow requested | CEO | open | — |

## GA gates

| ID | Gate | Owner | Status |
|---|---|---|---|
| G1 | Counsel memo on wallet and escrow received and acted on | CEO | open |
| G2 | Web push: service worker, VAPID, `push_subscriptions`, trigger off the Expo API | Eng | open |
| G3 | Durable rate limiting (not in-process memory) | Eng | open |
| G4 | Cookie consent | Eng | open |
| G5 | Admin alert moderation | Eng | open |
| G6 | Audit row for every admin action | Eng | open |
| G7 | Payment reconciliation view | Eng | open |
| G8 | Design-check baseline at zero on public surfaces | Eng | open |

## Budgets

Measured with Lighthouse mobile (Moto G class, slow 4G) and real-user Web Vitals.

| Metric | Pilot | GA |
|---|---|---|
| LCP | < 2.5 s | < 2.5 s |
| INP | < 200 ms | < 200 ms |
| CLS | < 0.1 | < 0.1 |
| First-load JS, any pilot route | ≤ 300 KB | ≤ 250 KB |
| First-load JS shared by all | ≤ 163 KB (no growth) | ≤ 140 KB |

Measured 17 Nov 2026 (`next build`, gzip), after adding Sentry:

| Route | First-load JS |
|---|---|
| shared by all | 163 KB |
| `/home` | 297 KB |
| `/wallet` | 329 KB |
| `/ride/[id]` | 331 KB |
| `/trips` | 333 KB |
| `/trips/[id]` | 344 KB |
| `/publish` | 350 KB |

The levers, in order: load only the active Publish variant, then the map, then the KYC form, all through `next/dynamic`. After that, find what sits in the 106 KB shared chunk. Also measure Sentry's client cost; if it is over 25 KB, load its tracing lazily.

## Migration ground truth

Fill this from the live database (`pg_tables`, `pg_proc`), not from `supabase_migrations`. The history table has been wrong before.

| Migration | Staging | Prod | Checked |
|---|---|---|---|
| 034–052 | — | unknown | — |
| 053 trip journey | — | not applied | — |
| 075, 077–082 | — | — | applied to the dev DB 23 Nov 2026; functions and settings checked live |
| 083 chat from booking | — | — | applied to the dev DB 24 Nov 2026; `booking_conversation` and `conversation_open` accept unpaid seats, grants unchanged |
| 085 payout lookup index | — | — | applied to the dev DB 24 Nov 2026; partial index on `wallet_transactions (booking_id) WHERE type = 'payout'` |
| 084 pickup location | — | — | applied to the dev DB 24 Nov 2026; `pickup_locations` with RLS (passenger and driver read), `share_pickup_location` authenticated only, clear-on-board trigger, in `supabase_realtime` |
| 086 six-hour chat on accept | — | — | applied to the dev DB 24 Nov 2026 outside the repo; file recovered from `supabase_migrations` byte for byte. Its pickup-location removal is reversed by 091 |
| 087–090 batch settings, boarding avatar, sidebar counts, open support case | — | — | applied to the dev DB 24 Nov 2026; four functions present, anon has no execute, `trip_boarding_status` returns `passenger_avatar_url` |
| 091 live location both ways | — | — | applied to the dev DB 24 Nov 2026; `pickup_locations` back with RLS and in `supabase_realtime`; passenger and driver share from 20 minutes before departure on a paid booking, until the trip ends; cleared when the booking leaves confirmed or in progress; purge keeps pre-departure driver positions |

## Design drift

From the `kipita` MCP `design_tokens` tool, comparing `apps/web/lib/nocturne.ts` to the design file. Resolve in the design pass.

| Role | Design file (light / dark) | Code (light / dark) |
|---|---|---|
| tan | `#D4B896` / `#D4B896` | `#ea7747` / `#d4b896` |
| onSurfaceVariant (`muted`) | `#40564E` / `#A0A6A1` | `#40564e` / `#C4C8C4` |
| mutedText (`muted2`) | `#5F6E66` / `#9AA39D` | `#5f6e66` / `#A0A6A1` |
| surfaceContainerLowest (`surface`) | `#FFFFFF` / `#1D201E` | `#fffefb` / `#1D201E` |
| surfaceContainerHigh (`surface3`) | `#F5F3EB` / `#272B28` | `#f1f5ee` / `#272B28` |
| outline | `#718078` / `#878D88` | no token |

## Verification

Each gate closes only when its check passes, on staging and then on prod.

1. **RLS.** With the anon key, `select` from `phone_verifications` is denied, `rpc('deduct_seats')` is denied, and selecting `date_of_birth` from `users` is denied.
2. **Escrow.** `release-escrow` as the driver on a confirmed, unfinished booking returns 409. A completed booking is released by the scheduler without anyone pressing a button.
3. **Callback replay.** The same success callback posted twice gives one confirmation, one notification and one trip-count increment.
4. **Late payment.** A hold expires, then the success callback lands. A refund row and a wallet credit appear and the passenger is notified.
5. **B2C.** A KES 10 withdrawal on prod is marked `paid` by the result callback. A forced failure re-credits the wallet and reconciles with `balance_after`.
6. **Seeds.** No trips from the seed window remain on prod. `supabase db reset` on staging seeds only from `seed.sql`.
7. **No fake data.** With a wrong anon key, search shows its error state.
8. **Journey smoke.** Playwright at 390 px and 1280 px, light and dark, reduced motion on: search, ride, request, accept, pay, start, live card, end, rate. Also publish, KYC, wallet top-up and withdraw.
9. **Speed.** Lighthouse meets the budgets above.
10. **Gates.** Typecheck, lint, design-check and CI are green.
