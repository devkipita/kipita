# Kipita — December 2026 launch assessment

A response to the Kotlin Multiplatform proposal of 22 October 2026, and a plan for
what it takes to launch.

Written against a survey of all three surfaces (web, mobile, Supabase) performed
2026-10-22 at commit `9e93bee`. Nothing here is taken from the roadmap; every claim
was read out of the source, the migrations or the edge functions. `docs/PARITY.md`
was last revised 2026-09-28 and is now wrong in five places — corrections are listed
at the end.

**Scope assumed:** public web plus both mobile apps in the stores, during December.
**Team assumed:** one developer. A two-person comparison is in Part 4.

---

## Part 0 — External clocks

None of these move faster if we work harder. Start all four, then fill in the dates.

| Clock | Started | Expected | Landed | Notes |
|---|---|---|---|---|
| Safaricom Daraja go-live (C2B) | | | | Highest risk on the board |
| Safaricom Daraja go-live (B2C) | | | | Needed for driver payouts |
| D-U-N-S number | | | | Prerequisite for both org accounts |
| Google Play account (org) | | | | Org is exempt from the 12-tester gate |
| Apple Developer Program | | | | Individual is 24–48h; org is 1–4 weeks |

**Decision point ~14 November:** if the organization Play account has not cleared,
fall back to a personal account and start recruiting 12 testers that day.

---

## Part 1 — On the Kotlin Multiplatform proposal

**Recommendation: do not rebuild for December. Keep KMP open as a Q2 2027 decision.
Adopt the proposal's backend section immediately — it is its most valuable
contribution and it is correct.**

### What the proposal gets right

Its central security finding is real, and the situation is worse than it states.
Four of ten edge functions create their Supabase client with the service-role key
and never verify the caller:

- `supabase/functions/release-escrow/index.ts:63` reads
  `if (driver_id && booking.driver_id !== driver_id)`. **Omitting `driver_id` from
  the request body skips authorization entirely.** Any caller can release any
  booking's escrow, which pays out real M-Pesa money and converts referrals.
- `initiate-payment`, `confirm-payment` and `check-payment` share the shape — they
  trust `user_id` from the body.
- `withdraw-wallet:28-29`, `topup-wallet`, `request-refund` and `resolve-refund`
  *do* verify via `auth.getUser(jwt)`. The correct pattern already exists in this
  repo; it was simply never applied to the other four.

The proposal is also right that native is genuinely better for background location
and geofencing, that Expo's background-location story is weak, that the robust
third-party option carries a paid Android release licence, and — most importantly —
that *"a new stack doesn't fix backend problems."* That sentence is true, and it
cuts against the proposal's own conclusion.

### Where the comparison does not hold

- **It compares a finished Kotlin app against today's unfinished Expo app.** The
  honest comparison is finished against finished. The difference between those two
  is live tracking and maps, which is a *feature* decision, not a stack decision.
- **It reads unfinished work as a React Native limitation.** There is no GPS because
  `expo-location` was never installed. `createBooking`
  (`apps/mobile/src/lib/api/bookings.ts:96`) has zero callers because nobody wired
  it. 26 of the 43 type errors have a single cause: no generated Supabase `Database`
  type. None of these are constraints React Native imposed, and all of them travel
  unchanged into Kotlin.
- **The iOS risk is understated.** Compose Multiplatform on iOS is the least-proven
  part of KMP, and the proposal's own fallback — "we can build the iOS UI in
  SwiftUI" — doubles the UI work the rebuild was meant to save, converting a
  shared-UI win into a shared-logic win.
- **One constraint is missing entirely, and it may be decisive: EAS builds iOS
  without a Mac.** Development here is on Windows. A Compose Multiplatform iOS build
  requires Xcode on macOS. This is not a convenience difference; it is the difference
  between shipping iOS and not.
- **"Freeze the Expo app" is the costliest line in the proposal.** The Expo client
  layer is the part closest to done — roughly 25k lines across 17 routes, with the
  screens largely built. What is missing is a data layer, and that is weeks.

**Point 8 — "plays to our strengths" — survives intact.** If Kotlin and Compose are
genuinely the team's strongest stack, that is a real and durable advantage. It simply
does not fit inside ten weeks.

### Why no version of KMP works for December

1. **The proposal's own estimate exceeds the runway.** "Months" against an eight-week
   usable runway. There is no arithmetic to debate.
2. **A rewrite fixes none of what is actually broken.** Unauthorized edge functions,
   unknown migration state, no `config.toml`, no generated DB types, self-approvable
   `driver_profiles`, no withdrawal worker, sandbox Daraja, mock-on-error fallbacks,
   no error reporting, no CI. Every one is backend or data-layer. All of it would be
   carried into Kotlin, with the client rewrite paid on top.
3. **"Start KMP in parallel" is not parallelism below three people.** With one or two
   developers it is a context switch that halves throughput on both codebases.

### What would make the bet correct later

All of these must hold; none hold today. We have shipped and have 3+ months of
production data. We have hit a *specific, documented* Expo wall — realistically,
sustained background location under aggressive Android OEM battery management. We
have at least one more engineer, so the rewrite is not serialised against all feature
work. And we have accepted that we may write SwiftUI for iOS regardless.

**Before reopening the question, spend one week spiking `expo-location` +
`react-native-maps` in the existing app.** That week either closes the question or
makes the case with evidence rather than assumption. It is the cheapest decisive
experiment available, and it should happen before any further design work.

---

## Part 2 — Is December achievable?

**Web: yes, comfortably. Both stores in December: no, on the honest reading.**

### The runway is eight weeks, not ten

Today is 22 October. Both store review pipelines slow from around 18 December through
the first week of January. The last useful *submission* date is ~**15 December**; the
last useful *approval* date is ~**19 December**. That is roughly **40 working days**.

### The engineering floor, before any store review

| Work | Solo days |
|---|---|
| Edge-function authorization (4 functions) | 3–4 |
| Migration ground truth 022–032 + `config.toml` | 2–4 |
| Supabase types + clearing the remaining type errors | 2–3 |
| Mobile booking → payment wiring | 5–8 |
| Removing mock-on-error fallbacks | 2 |
| `driver_profiles` RLS + trips INSERT gating | 2 |
| B2C withdrawal result handler + queue worker | 3–4 |
| EAS from zero to a green production build | 4–8 |
| Store compliance assets and forms | 3–5 |
| Web launch blockers + error reporting | 3–5 |
| Real end-to-end Daraja testing | 4+ |

**32–50 working days against a 40-day runway**, before a single review cycle.

### The two things most likely to kill the date

**1. Daraja production go-live — highest risk overall.** It is the only blocker that
is externally gated with an unpredictable queue, impossible to compress with effort,
required for *both* stores and for the web launch to be real rather than a sandbox
demo, and not yet started. The Play gate is worse in raw days but it is
*deterministic* — a known 21 days can be scheduled around. Daraja might be five days
or twenty-five, and we only learn which by waiting.

**2. Apple Guideline 2.1 — the non-obvious one.** App Review requires a
reviewer-completable core flow with a demo account. **A reviewer in California cannot
receive an M-Pesa STK push on a Safaricom number.** Nothing in the repo suggests a
demo payment path exists. Without one, submissions will be rejected repeatedly and
the rejection text will not explain why. Ride booking is a real-world service, so
M-Pesa is correct and IAP does not apply under 3.1.5(a) — but budget one cycle for a
reviewer flagging it anyway.

**Runner-up:** the first EAS production build on RN 0.86 + New Architecture +
`react-native-mmkv` v3 with nitro-modules, produced by someone who has never made
one. Budget a week, and schedule it in week 3, not week 7.

---

## Part 3 — The Play account decision

A one-way door, worth real days. Decide it this week.

| | **Organization account** | **Personal account** |
|---|---|---|
| Closed-testing gate | **Exempt.** Publish straight to production. | **12 opted-in testers for 14 continuous days**, then apply for production access (reviewed in ≤7 days). |
| Prerequisite | D-U-N-S number (1–5 business days) + Google org verification | Identity and address verification only |
| Lead time | Non-deterministic, often multi-week, can bounce | Deterministic ~21 days once a signed AAB exists |
| Can open testing substitute? | n/a | **No.** Only closed testing counts toward the gate, and open testing only unlocks *after* production access. There is no public Android install link in December without clearing it. |
| Earliest realistic production | Mid-December if verification clears in week 1 | 19–22 December, requiring a signed AAB by **24 November** and zero slippage |

Details that bite: "opted in" means the tester accepted *and installed* under the
matching Google account; since 2026 Google also checks the testers genuinely used the
app; and the 14-day clock is measured per tester from when the closed-testing release
goes live, so a late twelfth tester resets the effective date.

**Recommendation: request the D-U-N-S number now and pursue the organization account,
but hedge against the ~14 November decision point above.** The hedge costs nothing and
the D-U-N-S number is useful regardless.

---

## Part 4 — Launch shapes

**Option A — Web GA in December, mobile public beta, store listings January.
(Recommended.)**
Web fully public 28 November–5 December on real M-Pesa. Mobile ships as a **TestFlight
external beta** — publicly installable by link, lighter review than full App Store
review, no 14-day gate. Android runs closed testing in parallel and reaches production
in January.
*Gives up:* the literal "in the App Store and Play Store" claim, the store-launch
moment, and store discoverability.
*Keeps:* a real December launch, real mobile users on real money, and enough slack not
to ship an escrow drain.
*Confidence ~75%.*

**Option B — Web GA December + Android production late December, iOS January.**
As above, plus the organization Play account clears and Android goes to production,
deliberately dropping iOS from the December critical path to free ~1.5 weeks.
*Gives up:* iOS in December, most bug-fix slack, Android soak time.
*Confidence on Android in production by 22 December: ~35%.*

**Option C — Web-only December, both stores 20–31 January.**
Declare web the December launch. Use December for mobile done properly: real soak
testing, unhurried Apple cycles, Play's 14 days running over the holidays when we are
not shipping anyway.
*Gives up:* any mobile presence in December.
*Confidence ~90%.*

**Ranking: A, then C, then B.** B ranks last despite being the most ambitious, because
it concentrates all risk into the fortnight when reviewers are least responsive and we
are least able to iterate, on a codebase with no tests and no error reporting.

### What a second developer buys

| | **Solo** | **Two developers** |
|---|---|---|
| Recommended option | A | B becomes genuinely reachable |
| Both stores in December | ~20–35% | ~55–65% |
| What it unlocks | — | Real parallelism: one owns backend + web, the other owns mobile end to end. The tracks barely touch once the Supabase types land. |
| Where it does *not* help | — | The external clocks. Daraja, Apple and Play run at the same speed for any team size. |
| Best split | — | Person 1: all of Part 5's backend and web items. Person 2: EAS bootstrap in week 1 rather than week 3 — that single move is the main schedule win — then the mobile data layer. |

**A second developer moves us from Option A to Option B. It does not make Option B
safe, and it cannot touch the highest-risk item. If the second person arrives after
~10 November, plan as if solo.**

---

## Part 5 — What remains

### Backend — blocks everything

| # | Item | Blocker? |
|---|---|---|
| B1 | **Authorize the four unguarded edge functions.** Apply the `auth.getUser(jwt)` pattern from `withdraw-wallet/index.ts:28-29` to `initiate-payment`, `confirm-payment`, `check-payment`, `release-escrow`. Derive the acting user from the token, never the body. `release-escrow:63` first. | **Hard.** This is money, and it is reachable from the web today. |
| B2 | **Establish ground truth on migrations 022–032.** Query `pg_tables` / `pg_proc` against the live project, not `schema_migrations` — `docs/PARITY.md:37` explains why. Record the result here. | **Hard.** 025 drops and recreates `credit_wallet` with a 6th argument that deployed functions already pass. |
| B3 | **Daraja production credentials**, C2B and B2C, and set `MPESA_BASE_URL` explicitly — it defaults to sandbox in all four payment functions. | **Hard.** Longest external lead time. |
| B4 | **B2C withdrawal result handler + queue worker.** Today `withdraw-wallet` debits the wallet, queues the payout as `pending`, and nothing sends the money. Needs the result callback endpoint, status reconciliation and a worker draining the queue. Re-credit on failure already exists. | **Hard.** |
| B5 | **Commit `supabase/config.toml`.** Auth providers, Site URL, redirect allow-list and per-function `verify_jwt` are dashboard-only state today. `mpesa-callback` must be `verify_jwt = false`; the rest must not be. | **Hard.** |
| B6 | **Tighten `driver_profiles`.** RLS is `FOR ALL USING (own row)` with no column grants, so a client can set its own `approval_status`. `trips` INSERT never consults `driver_profiles`. | **Hard.** A safety claim we cannot back server-side is a legal exposure, not just a bug. |
| B7 | Generate Supabase `Database` types into `packages/shared`; wire both clients. | **Hard** — and it clears 26 of mobile's 43 type errors in one commit. Do it before touching mobile. |
| B8 | Move `031_seed_demo_trips.sql` out of the migration chain. | Should-fix — it runs in production. |

### Mobile — critical path to two stores

| # | Item | Blocker? |
|---|---|---|
| M1 | **`eas.json`, an EAS project, `extra.eas.projectId` in `app.json`.** None exist; no store build has ever been produced. A custom dev client is mandatory — MMKV v3 + nitro means Expo Go cannot run this app. | **Hard.** Week 3 at the latest; week 1 with two people. |
| M2 | **Apple Developer and Google Play accounts.** See Part 3. | **Hard, external.** |
| M3 | **Wire booking → payment.** Call `createBooking` (`src/lib/api/bookings.ts:96`, zero callers); delete `temp-${trip.id}` at `src/app/ride/[id].tsx:91` and the fake 1.4s success at `src/components/shared/SheetOrchestrator.tsx:56-60`; drop the `startsWith("temp-")` guards at `src/app/trip/[id].tsx:146,168`. | **Hard** — without this the app has no product. |
| M4 | **Remove mock-on-error fallbacks** in `fetchAlerts` / `fetchTrips` / `fetchRequests` / `fetchNotifications`. They return seed data on *error*, not just on empty, so an RLS failure renders as a healthy screen. | **Hard** — otherwise we launch blind. |
| M5 | Clear the ~17 type errors remaining after B7 (`StyleSheet` unions, nav typing at `src/app/(tabs)/_layout.tsx:16`). | **Hard in practice.** |
| M6 | **Store assets.** The icon is `src/assets/favicon_io/android-chrome-512x512.png` — a 512px web favicon. **Apple requires 1024×1024 opaque and will reject this.** Also splash image, screenshot sets, privacy-policy URL (`/legal/privacy`), Apple privacy labels, Play Data Safety, age rating, export compliance. | **Hard.** |
| M7 | **In-app account deletion.** Mandatory on both stores; automatic rejection without it. | **Hard.** |
| M8 | **Reviewer demo path for payments** that completes without a Kenyan phone number. | **Hard for iOS.** |
| M9 | Alert photo upload — `AlertPostSheet.tsx:39` writes a `file:///` URI into `image_url`. Comments already upload correctly via `uploadChatMedia`; reuse it. | Near-blocker, visibly broken. |
| M10 | Push via FCM and APNs. Migration 007's trigger speaks only the Expo Push API. | Defer unless we advertise push. |
| M11 | `ALERT_SELECT` (`src/lib/api/alerts.ts:5-8`) never fetches `user_reaction`; MMKV session storage is unencrypted; mobile never writes `route_interests`. | Should-fix. |
| M12 | **GPS, maps, live tracking.** | **Out of scope for December.** Q1 spike — see Part 1. |

### Web

| # | Item |
|---|---|
| W1 | **Delete the mock support widget** (`components/help/ChatSupport.tsx:13`, with fabricated case history at `:30-65`) from the public `/help` page. Keep the FAQ. Real DB-backed support stays in the signed-in shell via `components/support/SupportDock.tsx`. |
| W2 | Cookie consent banner. We set `kipita-mode`, the referral cookie and Supabase auth cookies with no prompt, and have a cookie *policy* with no *mechanism*. |
| W3 | Error reporting (Sentry or equivalent) plus `global-error.tsx`. One root `error.tsx` is the entire boundary today and a root-layout crash has no fallback. With no tests and no CI, crash reporting is the only feedback channel. |
| W4 | Admin driver-KYC review screen — pairs with B6. Without it `approval_status` can only be changed by hand in SQL. |
| W5 | Admin alert moderation. Migration 022 added author-only five-minute edit/delete; there is still no admin override. |
| W6 | Fix stale claims at `lib/bookings.ts:11-13` and `apps/web/PRODUCT.md:31` — both say web payment is unfinished. It works end to end. |
| W7 | Rate limiting is in-memory and therefore per-instance (`lib/security/rate-limit.ts:10-13`). Acceptable at launch volume; noted, not fixed. |

### Cross-cutting

- One GitHub Actions workflow running `typecheck` and `build` on push. Not a test
  suite — just enough to stop a red mobile typecheck reaching a store build. There is
  no `.github` directory at all today.
- Rewrite `docs/PARITY.md`. See the corrections below.

---

## Part 6 — Week by week (Option A, solo)

**Week 0 · 22–25 Oct.** Before any code: file Apple enrolment, Google Play
registration, the D-U-N-S request and the Daraja go-live application — all four then
run in the background. Then B1 (`release-escrow:63` first) and B6.

**Week 1 · 26 Oct–1 Nov.** B2 migration ground truth; resolve the 025 `credit_wallet`
signature against deployed callers; commit `config.toml` (B5); reclassify 031 (B8).
Generate Supabase types (B7). Wire error reporting into web and mobile (W3).

**Week 2 · 2–8 Nov.** Mobile data layer: M3, M5, M4. Then B4.

**Week 3 · 9–15 Nov.** **EAS from zero** (M1). Assume 3–5 days of native build
failures — this is the week most likely to blow up, which is why it is here and not
week 7. Target a green production build on both platforms. In the gaps: W1, W2, W6.
**Play account decision point ~14 Nov.**

**Week 4 · 16–22 Nov.** Store compliance: M6, M7, M8. Daraja credentials should be
landing — swap `MPESA_BASE_URL` and run real end-to-end transactions on web and on
device. Freeze the web release candidate.

**Week 5 · 23–29 Nov. Web goes public.** This is the December launch, happening in
November so there is slack. Submit the first TestFlight build (external beta review,
1–2 days). On the personal Play path, closed testing must start by **24 Nov**. Spend
the rest of the week on what real users break.

**Week 6 · 30 Nov–6 Dec.** TestFlight external link public; beta users on real M-Pesa.
Fix what error reporting surfaces. Play closed test at day 7. **Add no features.**

**Week 7 · 7–13 Dec.** Closed test completes; apply for Play production access (≤7
days). Submit iOS for full review 8–10 Dec so the first rejection lands with time to
respond.

**Week 8 · 14–20 Dec.** Play production decision. iOS rejection cycle two. **15 Dec is
the last submission worth attempting**; after 18 Dec assume nothing moves until 5 Jan.

**January.** Production listings on both stores. *Then* spike `expo-location` +
`react-native-maps`, and reassess KMP against real evidence.

Deliberately absent: GPS and maps, peer-to-peer chat, web push, and any test suite
beyond typecheck in CI. **If any of those is non-negotiable for December, take
Option C.**

---

## Part 7 — Verification

- **B1** — call `release-escrow` with user A's valid JWT, a `booking_id` belonging to
  user B, and `driver_id` omitted. Must return 403. Today it releases the funds.
- **B2** — `select proname, pronargs from pg_proc where proname = 'credit_wallet'`
  (6 arguments means 025 is applied); `select tablename from pg_tables where tablename
  in ('wallet_topups','referral_codes','alert_views','support_cases')` covers
  023/024/025/030.
- **B3** — a real KES 1 STK push against the production shortcode, confirmed on a
  handset.
- **B4** — request a withdrawal and confirm the B2C result callback completes the row;
  force a B2C failure and confirm the wallet is re-credited and reconciles against
  `balance_after`.
- **B6** — as a plain authenticated user, attempt
  `update driver_profiles set approval_status='approved'`, and attempt a `trips`
  insert without an approved driver profile. Both must fail.
- **M1** — an `.ipa` installed via TestFlight and an `.aab` accepted by Play. **This is
  the gate that proves the date.**
- **M3** — reserve a seat on mobile, then confirm a `bookings` row exists with a UUID
  id and `status = 'pending_payment'` *before* the payment sheet opens.
- **M4** — point the app at a bad anon key. Every screen must show an error state, not
  seed data.
- **M8** — a reviewer-mode account completes a booking end to end with no Kenyan phone
  number.
- **Typecheck** — `yarn typecheck` green at the repo root across both workspaces.

---

## Part 8 — Corrections to `docs/PARITY.md`

Verified 2026-10-22. PARITY was last revised 2026-09-28 and migrations 022–032 were
authored after it.

1. `:233` — web **does** have a booking detail screen: `/trips/[id]`
   (`app/(app)/trips/[id]/page.tsx:12`).
2. `:94` — web **does** have partial vehicle CRUD: read, create/update via the publish
   flow (`lib/home/posts.ts:77-105`) and photo upload/delete (`lib/home/vehicle.ts`).
   Still no standalone management screen and no delete.
3. `:209`, `:257` — migration 022 **did** add UPDATE and DELETE policies on
   `announcements` (`022:122-140`), author-only within five minutes. The conclusion
   survives for a different reason: there is still no admin override, so moderating an
   older alert remains impossible from any client. `alert_comments` still has no
   UPDATE or DELETE policy at all.
4. `:210` — `announcements` **is** in the `supabase_realtime` publication
   (`022:155-165`).
5. `:239` — "no chat at all" understates it. Peer-to-peer chat is still web-absent, but
   real DB-backed **support** chat ships on web (`components/support/SupportDock.tsx`).

Not covered by PARITY at all and material here: zero tests, zero CI, zero error
reporting, a single root error boundary with no `global-error.tsx`, per-instance rate
limiting, no cookie consent mechanism, and the mock support widget on public `/help`.

Corrections 3 and 4 depend on migration 022 having been pushed, which **is not
recorded anywhere** — see B2.
