# UI pass — function, design, skeletons, motion

The working backlog for making the web app fully functional and finished before launch. It was built on 17 Nov 2026 from two audits: function and design, and motion. Tick an item only when it is verified at 390 px and 1280 px, in light and dark, with reduced motion on.

**The rule:** nothing appears from nowhere. Everything enters from something already on screen and leaves back into it. The details are in `.claude/skills/kipita-motion/SKILL.md`.

**Locked to the trips session until it says otherwise:** `components/trips/*`, `components/publish/PublishWeb.tsx`, `components/publish/PublishMobile.tsx`, `components/ui/ConfirmPop.tsx`, `lib/trips/*` and `lib/maps/*`. The 🔒 items below wait for that.

## Status: 17 Nov 2026, evening

Four surface agents ran in parallel and all stopped on the usage limit, which resets at 22:30 Nairobi time. The tree is green:
- typecheck: 0 errors
- lint: 0, with the suppressions pruned after the fixes
- design-check: 0 regressions; findings fell from 527 to 472 and the baseline was tightened
- browser: `/home`, `/alerts`, `/auth/sign-in` and `/auth/sign-up` load with no runtime errors in light and dark, and signed-in routes redirect to sign-in

Where each agent stopped:

| Area | State |
|---|---|
| Wallet, notifications, profile, menu | Wallet done in code: errors surface (`WalletError`, Sentry capture), payouts go only to the verified phone (masked, with a "Verify your phone to withdraw" state), fetches run in parallel. Not started: the rolling balance, notifications, profile, the account menu, SupportDock. |
| Alerts and auth | Alerts partly done: owner menu (Popover plus `useConfirm`), composer, card, actions, search, comment and badge edits. Auth not started. Each alerts item needs checking against the list below. |
| Ride detail and payment | Only `components/rides/RideLayout.tsx` was extracted: shared layout plus the `morph-hero` frame. It is not wired in yet; `RideDetailView` and the skeleton should import it. |
| Home and search | Read only. No edits. |

Open findings from the 17 Nov browser check:
- The `/home` hydration mismatch on the `style` attribute of readOnly inputs and the filter checkboxes.
- Under `colorScheme: dark` emulation the app still renders light. Check whether `ThemeRuntimeProvider` follows the system setting or only a stored choice.

## Foundations

- [x] `motion` v12 with `LazyMotion` (strict, lazy-loaded features), honouring reduced motion (`components/anim/MotionProvider.tsx`)
- [x] Spring and tween tokens in `lib/motion.ts`
- [x] `ui/Drawer`:
  - Phones: a sheet with drag-to-dismiss and an exit animation.
  - Desktop: grows from the control that opened it.
  - The API is unchanged.
- [x] Phone chrome collapses on scroll down and returns on scroll up (`nav/useScrollChrome.ts`). Sticky sub-headers follow it.
- [x] Bottom tab indicator slides between tabs (`layoutId`)
- [x] The account menu is the avatar pill growing into the card (`ui/MorphMenu` clip-path container transform), with the avatar turning into an X. Verified in a browser at 1280 and 390 with frames at 40, 90 and 400 ms, focus moving to the first item, and Escape folding it back and returning focus.
- [x] The publish icon is the same `PlusCircle` in the top bar and the bottom bar (one shared `PUBLISH_ITEM`)
- [x] Activity (18 Nov), browser-verified with mocked rows at 1280 and 390:
  - Bell plus unread count in the top bar. Desktop is a MorphMenu that grows from the button; phones get a full-height sheet (kipita-c8).
  - `/notifications` is redesigned as Activity: a "Needs you" section, rows grouped by day, action chips, chip tabs with counts, keyset "Show earlier", and designed skeleton, empty and error states.
  - Every kind routes to where you act. A seat request goes to `/trips/{booking}`; a ride wanted goes to `/publish?from&to`; the prefill itself was requested from kipita-fe.
- [x] Top bar actions: 34px icon wells with 21px glyphs and a colour-only lime hover. Road alerts uses `TrafficCone` with a new-alerts count. Logo and actions sit on the left; Activity and the account menu on the right.
- [ ] Reminders (pay due in 10 minutes or less, departure in 2 hours or less) need a pg_cron job. Specced to kipita-fe; the UI already renders them.
- [ ] Popover primitive anchored to its trigger, with an exit. It replaces the account menu, sort, the alert owner menu, the composer menus and the date-of-birth menu.
- [ ] Shared tab indicator for the in-page tabs: notifications, alerts, the place picker, 🔒 trips
- [ ] Accordion helper using `grid-template-rows`: the composer pill row, the push banner, 🔒 the help rows
- [ ] In-place crossfade where the height follows the content: payment stages, the alert card editor, booking banners
- [ ] Skeleton-to-content crossfade, with one shimmer style on nocturne tokens
- [ ] Cross-route View Transitions:
  - ride card → `/ride/[id]`
  - Reserve → booked chip
  - 🔒 trip card → `/trips/[id]`
  - profile → edit

## P0 — the core book-a-ride flow

- [ ] Search pill grows into the full-screen search and shrinks back (`home/FindRideSearchBar.tsx:1087`)
- [ ] The tapped field becomes the place picker's input (`home/PlaceModal.tsx:518`)
- [ ] `/home` search shows a skeleton while searching and an error state on error. Remove the `.catch(() => [])` (`app/(app)/home/page.tsx:45`, `FindRideView.tsx:752`).
- [x] The Reserve button shows the real total including the fee (`rides/RideDetailView.tsx:933`)
- [ ] One orange action per screen:
  - "View ride" turns green (`FindRideView.tsx:466`).
  - Pay with M-Pesa becomes the orange action (`PaymentDrawer.tsx:289`). Done in `rides/PaymentDrawer`; the live flow is `trips/PayPanel.tsx` (trips session).
  - Top up becomes the orange action on `/wallet`.
- [ ] After an M-Pesa timeout, re-check the payment status before sending a second prompt (`PaymentDrawer.tsx:297`). Done in `rides/PaymentDrawer`; 🔒 still open in `trips/PayPanel.tsx`, the drawer users actually see.
- [x] Wallet errors surface instead of showing KES 0 (`lib/wallet/server.ts:32,52,83`)
- [x] Withdrawals pay out to the verified phone, shown read-only (`wallet/WithdrawDrawer.tsx:257`). The server still accepts a body phone; that is gate P2 in `LAUNCH.md`.
- [ ] The `/home` skeleton matches the phone search pill, the card grid and 6 cards (`app/(app)/home/loading.tsx`)

## P1

- [x] Ride detail: surface a load error instead of a 404, and fetch in parallel (`lib/ride-detail.server.ts:59-98`)
- [x] Replace the "respond in the app" and "manage in the app" dead ends with web actions (`RideDetailView.tsx:851-893`)
- [x] Back link goes to where the user came from (`RideDetailView.tsx:608`)
- [ ] Remove the invented popular-route prices (`FindRideSearchBar.tsx:1336-1349`)
- [ ] Show "New" instead of "0.0 · 0 trips", and stop ranking new drivers as worst (`FindRideView.tsx:799`, `ProfileView.tsx:274`)
- [ ] Drop "Best match" unless it means something (`FindRideView.tsx:761`)
- [ ] The empty state's action does something useful instead of linking to `/home` (`FindRideView.tsx:885`)
- [ ] Notification preference toggles: wire them up or remove them; the push copy must be honest (`NotificationsCard.tsx:37-80`)
- [ ] `ConfirmPop` instead of `window.confirm` in four places: alerts owner menu, FAQ manager, promotions, refunds
- [ ] Alerts "Load more" error stays inline (`AlertsView.tsx:530`); the "Nearby" tab says so when location is off (`:383`)
- [ ] Route-specific skeletons:
  - `/ride/[id]`: green band plus side panel (done, `rides/RideDetailSkeleton.tsx`)
  - `/wallet`: balance band
  - `/notifications`: 760 px wide, no second spinner
  - `/profile`: hero plus stats
  - `/profile/edit`: two columns
  - `/alerts`: real order; no composer for guests
- [ ] Ride cards use the shared `Avatar` with its fallback (`FindRideView.tsx:785`)
- [ ] The keyboard can open the place picker from the phone search sheet (`FindRideSearchBar.tsx:1252`)
- [ ] Field borders move from `line` to an outline-strength token. Add `--n-outline`.
- [ ] Result-list stagger: first 5 cards, 300 ms or less, on submit only (`FindRideView.tsx:229-247`)
- [ ] The support dock morphs with transform or clip-path instead of width and height (`support/SupportDock.tsx:41`)
- [ ] Notification toast: exit animation plus swipe to dismiss (`notifications/NotificationToast.tsx:58`)
- [ ] The wallet balance rolls with `ui/Counter` after a top-up or withdrawal, and refreshes on close
- [ ] Composer pills unfold below the input instead of pushing it down (`alerts/AlertComposerInline.tsx:636`)
- [x] Payment errors keep their meaning instead of all becoming "couldn't reach M-Pesa" (`PaymentDrawer.tsx:160`). `initiatePayment` now throws a `PaymentError` with the reason; `trips/PayPanel.tsx` can show `err.message` too.

## P2

- [ ] Text at 12 px or larger: alerts, notifications, comments, category badge
- [ ] Targets at 44 px or larger: chips, sort and filter, steppers, day chips, the alert menu and actions, tabs, "Mark all read", the avatar trigger, log in and sign up
- [ ] 12-hour times everywhere (`FindRideView.tsx:600`, `RideFilters.tsx:18`)
- [ ] Copy:
  - "per seat" everywhere.
  - "Sign in" everywhere.
  - Sentence case in the legal rows.
  - Named buttons: "Clear filters", "Close payment", "See your trip", "Cancel top-up".
- [ ] Hex values into tokens:
  - `FindRideView.tsx:157,397`
  - `RideFilters.tsx:124`
  - `ProfileView.tsx:207`
  - the like colour in `AlertActions.tsx:144` and `CommentRow.tsx:68`
  - `AppTopBar.tsx`
  - `auth/*`
- [ ] Long values:
  - The wallet balance wraps.
  - Profile email gets `overflow-wrap`.
  - Truncated names carry a `title` attribute.
  - Media alert cards size to their text.
  - Empty vehicle line.
  - Notification count capped.
- [ ] Tab semantics (`role="tab"`, arrow keys) on the notifications, alerts and sign-in tabs
- [ ] Live regions for booking banners; `role="alert"` on payment and withdraw errors
- [ ] Auth:
  - Fields with a 3:1 edge.
  - Shake respects reduced motion.
  - Resend code.
  - Keep `next` on the sign-up link.
- [ ] The account menu offers sign out; menus handle arrow keys and Escape returns focus
- [ ] Delete `DEMO_DRIVERS` (`lib/rides.ts:70`)
- [ ] Token sweep of hard-coded durations and curves (see the motion audit list)
- [ ] 🔒 TripDetail ChatSheet double gate: the Drawer exit can never play (`TripDetail.tsx:965`)
- [ ] 🔒 StageArt runs five loops; the rule allows one

## Do not animate

- Keyboard highlight in lists.
- Overlays closed with Escape.
- Bottom-nav route swaps.
- Wallet ledger rows, notification lists, card rows past the first five.
- Counters that change on every keystroke.
- Map markers, beyond the Maps API's own updates.
