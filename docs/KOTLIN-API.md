# Kipita — Supabase integration guide for the Kotlin app

**Audience:** the Kotlin mobile team.
**Verified against the live database:** 5 November 2026.

You are not integrating against a REST API we wrote. **Supabase is the backend**, and you use it directly — Auth, Postgrest, Realtime, Storage and Edge Functions — against the same project the web app uses. There is no API layer to wait on and no business rule for you to re-implement.

The rules live in Postgres. You call them. The web calls the same ones. They cannot drift.

---

## 1. Setup

```
URL       https://opijacwnzkmzhaebquym.supabase.co
Anon key  sb_publishable_4iISxnKt9ctDUCJcAWe2aQ_ixo5BnZE
```

The anon key ships in the app. It grants nothing by itself — every permission comes from the signed-in user's JWT, evaluated by row-level security in the database.

**Never ship the service-role key (`sb_secret_…`) or an account token (`sbp_…`).** Both bypass RLS completely.

### Gradle

```kotlin
implementation(platform("io.github.jan-tennert.supabase:bom:<latest>"))
implementation("io.github.jan-tennert.supabase:postgrest-kt")
implementation("io.github.jan-tennert.supabase:auth-kt")
implementation("io.github.jan-tennert.supabase:realtime-kt")
implementation("io.github.jan-tennert.supabase:storage-kt")
implementation("io.github.jan-tennert.supabase:functions-kt")
implementation("io.ktor:ktor-client-okhttp:<latest>")   // Android
implementation("io.ktor:ktor-client-darwin:<latest>")   // iOS
```

### One client, shared

```kotlin
val supabase = createSupabaseClient(
    supabaseUrl = BuildConfig.SUPABASE_URL,
    supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
) {
    install(Auth) {
        alwaysAutoRefresh = true
        autoLoadFromStorage = true
    }
    install(Postgrest)
    install(Realtime)
    install(Storage)
    install(Functions)
}
```

### Test accounts

| Email | Password | Role |
|---|---|---|
| `rider@kipita.test` | `KipitaTest123!` | passenger |
| `driver@kipita.test` | `KipitaTest123!` | driver, KYC approved |
| `admin@kipita.test` | `KipitaTest123!` | admin |

---

## 2. Auth

Email/password, phone OTP and Google are all configured on the project.

```kotlin
supabase.auth.signInWith(Email) {
    email = "rider@kipita.test"
    password = "KipitaTest123!"
}

supabase.auth.signInWith(OTP) { phone = "+254700000001" }
supabase.auth.verifyPhoneOtp(OtpType.Phone.Sms, phone = "+254700000001", token = code)

supabase.auth.signInWith(Google)
```

Session persistence and refresh are handled for you. Observe it:

```kotlin
supabase.auth.sessionStatus.collect { status ->
    when (status) {
        is SessionStatus.Authenticated -> onSignedIn(status.session)
        is SessionStatus.NotAuthenticated -> showSignIn()
        else -> Unit
    }
}
```

### The one gotcha that will cost you a day

**`auth.users.id` is not `public.users.id`.** Every foreign key in this schema — `bookings.passenger_id`, `trips.driver_id`, everything — points at `public.users.id`. The auth id only appears as `users.auth_id`.

Resolve it once after sign-in and keep it:

```kotlin
@Serializable data class AppUser(val id: String, val full_name: String?, val avatar_url: String?)

suspend fun currentAppUser(): AppUser =
    supabase.from("users")
        .select(Columns.list("id", "full_name", "avatar_url")) {
            filter { eq("auth_id", supabase.auth.currentUserOrNull()!!.id) }
        }
        .decodeSingle()
```

The RPCs resolve it internally, so you only need this for reads and display.

---

## 3. How to decide where something lives

You will use both RPCs and Edge Functions. The split is not arbitrary:

| Use an **RPC** (`postgrest.rpc`) | Use an **Edge Function** (`functions.invoke`) |
|---|---|
| Anything that changes booking, seat or trip state | Anything needing a secret (M-Pesa, email) |
| Anything that must be atomic | Anything calling a third party |
| Hot paths the user waits on | Webhooks |

Seat allocation is the reason. `accept_booking` locks the trip row, checks capacity and decrements **in one transaction**. Split across HTTP calls, another request slips between the check and the write — which is exactly the bug that once let every passenger book the same last seat.

**Writes to `bookings`, `payments` and `trips` are revoked for clients.** Don't try to `update` them; it returns `42501`. Call the function.

---

## 4. The ride flow

All RPCs. Functions returning `SETOF` give you a **JSON array of one row** — use `decodeList().first()`, not `decodeSingle()`.

```kotlin
@Serializable
data class Booking(
    val id: String,
    val trip_id: String,
    val passenger_id: String,
    val driver_id: String,
    val booking_reference: String?,
    val seats_booked: Int,
    val total_price: Double,
    val status: String,
    val expires_at: String?,
)

@Serializable
data class Trip(
    val id: String,
    val driver_id: String,
    val from_location: String,
    val to_location: String,
    val departure_date: String?,
    val departure_time: String?,
    val seats_total: Int,
    val seats_available: Int,
    val price_per_seat: Double,
    val status: String,
)
```

### Passenger

```kotlin
suspend fun requestSeat(tripId: String, seats: Int): Booking =
    supabase.postgrest.rpc("request_seat", buildJsonObject {
        put("p_trip_id", tripId)
        put("p_seats", seats)
    }).decodeList<Booking>().first()

suspend fun cancelBooking(bookingId: String, reason: String? = null): Booking =
    supabase.postgrest.rpc("cancel_booking", buildJsonObject {
        put("p_booking_id", bookingId)
        reason?.let { put("p_reason", it) }
    }).decodeList<Booking>().first()
```

`request_seat` **does not take a seat.** The booking is created at `requested` and `trips.seats_available` is untouched until the driver accepts. Call it twice and you get the same booking back, not a second one.

### Driver

| RPC | Arguments | Returns |
|---|---|---|
| `publish_trip` | `p_from_location text, p_to_location text, p_departure_date date, p_departure_time time, p_seats_total int, p_price_per_seat numeric, p_preferences jsonb = '{}', p_vehicle_id uuid = null, p_pickup_point text = null, p_dropoff_point text = null` | `SETOF trips` |
| `accept_booking` | `p_booking_id uuid, p_hold_mins int = 30` | `SETOF bookings` |
| `decline_booking` | `p_booking_id uuid, p_reason text = null` | `SETOF bookings` |
| `start_trip` | `p_trip_id uuid` | `int` — bookings moved |
| `complete_trip` | `p_trip_id uuid` | `int` — bookings moved |
| `cancel_trip` | `p_trip_id uuid, p_reason text = null` | `SETOF trips` |

```kotlin
suspend fun acceptBooking(bookingId: String): Booking =
    supabase.postgrest.rpc("accept_booking", buildJsonObject {
        put("p_booking_id", bookingId)
    }).decodeList<Booking>().first()

suspend fun pendingRequests(myId: String): List<Booking> =
    supabase.from("bookings")
        .select { filter { eq("driver_id", myId); eq("status", "requested") } }
        .decodeList()
```

`accept_booking` is where the seat is taken. Idempotent — accepting twice returns the booking unchanged and does not decrement again. `publish_trip` refuses if you have no `driver_profiles` row, so verification is enforced server-side, not by hiding a button.

### Cancelling a whole ride

A driver who can no longer run a ride calls `cancel_trip`. It closes the trip **and every live booking on it** in one transaction — seats returned, paid fares refunded to each passenger's wallet, every passenger notified with the reason.

```kotlin
suspend fun cancelTrip(tripId: String, reason: String? = null): Trip =
    supabase.postgrest.rpc("cancel_trip", buildJsonObject {
        put("p_trip_id", tripId)
        reason?.let { put("p_reason", it) }
    }).decodeList<Trip>().first()
```

Only the ride's own driver, or an admin, may call it (`42501` otherwise). A ride already `in_progress` is refused with `22023` — stopping one of those is a support case, not a cancellation. Cancelling twice is also `22023`.

**Build a surface for this.** A driver's published rides are not reachable through `bookings`: a ride nobody has booked yet appears in no booking row. Query `trips` directly on `driver_id` or the driver has no way to find — or cancel — what they posted.

```kotlin
supabase.from("trips").select {
    filter {
        eq("driver_id", myAppUserId)
        isIn("status", listOf("posted", "active"))
        gte("departure_date", today)
    }
    order("departure_date", Order.ASCENDING)
}.decodeList<Trip>()
```

### What cancelling costs

**Nothing, on either side, for the pilot.** A paid fare returns to the passenger's wallet in full whenever it is cancelled, with no share withheld for the driver. Do not build a cancellation-fee screen, and do not quote one in copy. This is a deliberate pilot decision and will be revisited before public launch — when it changes it changes in `cancel_booking`, and you will not need to ship anything.

An unpaid booking (`requested` or `pending_payment`) simply releases the seat.

### Driver verification

```kotlin
supabase.postgrest.rpc("submit_driver_kyc", buildJsonObject {
    put("p_national_id", nationalId)
    put("p_license_number", licenceNumber)
    put("p_license_expiry", expiry)      // nullable
})
```

Only ever writes `pending`. A driver cannot approve themselves — that column is revoked, and `set_driver_approval` checks `is_admin()`.

### State machine

```
requested ──accept──▶ pending_payment ──pay──▶ confirmed ──start──▶ in_progress ──complete──▶ completed
    │                       │                      │                      │
    └──decline──▶ rejected  ├──expire──▶ cancelled │                      │
                            └──────────── cancel ──┴──────────────────────┘
```

Seats are held from `accept_booking`, returned by `cancel_booking` or by the expiry sweep. A `pending_payment` hold carries `expires_at`, 30 minutes by default (`hold_minutes`, §6).

`cancel_trip` cuts across this: it drives every non-terminal booking on the ride straight to `cancelled`, whatever state it was in.

### When `request_seat` will refuse you

The rule is **one place at a time, not one booking at a time.** A passenger booking Friday and Sunday is normal and works. Both of these raise `55006`:

- a booking already `in_progress` — you cannot be on two rides at once
- a booking within **three hours** of the new departure, across `requested`, `pending_payment` and `confirmed`

Surface `55006` as a clash ("You already have a seat booked around that time"), not as a generic failure — the passenger needs to know they must cancel something first. Do not add your own "one booking" cap on top; it will be wrong.

A driver gets the same guard on `start_trip`: one ride under way at a time.

---

## 5. Payment

An Edge Function, because it needs the Daraja keys.

```kotlin
supabase.functions.invoke("initiate-payment", buildJsonObject {
    put("booking_id", bookingId)
    put("method", "mpesa")
    put("phone", "2547XXXXXXXX")       // Daraja format, 254…
})
```

**Do not send `amount` or `user_id`.** Both are ignored — the caller comes from your JWT and the amount is read from the booking. Sending a smaller amount used to work; it no longer does.

Then watch the row. Safaricom calls `mpesa-callback`, which captures into escrow and confirms the booking. **The client never decides a payment succeeded** — only the callback does.

```kotlin
supabase.channel("pay-$bookingId").postgresChangeFlow<PostgresAction.Update>("public") {
    table = "bookings"
    filter("id", FilterOperator.EQ, bookingId)
}.collect { /* status -> confirmed */ }
```

---

## 6. Settings, flags and the fee

Rates and switches are **data, not constants**. They move without either app shipping. Read them; never hard-code them.

| RPC | Arguments | Returns |
|---|---|---|
| `fare_breakdown` | `p_total numeric` | `TABLE(total, fee, driver_earning, fee_percent)` |
| `setting_numeric` | `p_key text, p_default numeric` | `numeric` |
| `setting` | `p_key text` | `jsonb` |
| `flag_enabled` | `p_key text` | `boolean` |

```kotlin
@Serializable
data class Fare(
    val total: Double,
    val fee: Double,
    val driver_earning: Double,
    val fee_percent: Double,
)

suspend fun fareFor(total: Double): Fare =
    supabase.postgrest.rpc("fare_breakdown", buildJsonObject {
        put("p_total", total)
    }).decodeList<Fare>().first()
```

`fare_breakdown` is the answer to "what does the passenger pay, what does the driver get, what do we take". Call it before a booking and show all three — the passenger is entitled to see the split before they commit. It is readable by `anon` too, so you can quote a fare before sign-in.

**The fee is 12% today and will rise to 16–18% during testing.** It is one row in `platform_settings`, admin-editable, and every `payments` row stamps the `fee_percent` that actually applied, so historical bookings keep their rate. If you hard-code 12 anywhere, the app will quote one number and the ledger will record another.

### Settings you can read

| Key | Now | Meaning |
|---|---|---|
| `platform_fee_percent` | 12 | Kipita's cut |
| `hold_minutes` | 30 | how long a `pending_payment` hold lives |
| `fuel_cost_per_km` | 12.5 | KES/km behind the suggested fare |
| `fare_margin_percent` | 15 | headroom above fuel cost in the suggestion |

### Flags

| Key | Now | Gates |
|---|---|---|
| `send` | **on** | Kipita Send (§7). Preview only — off before public launch |
| `ride_chat` | on | chat on a live ride — **not built yet** |
| `road_alerts` | on | road alerts feed |
| `publish_before_approval` | on | drivers may publish while under review |
| `live_tracking` | off | location sharing during a trip |
| `instant_booking` | off | skip driver approval, hold the seat immediately |
| `web_push` | off | browser push |

A flag being on does not mean the feature is finished — `ride_chat` is on and has no implementation. Check this table, not just the flag.

`set_setting` and `set_flag` exist but are admin-only (`42501` for everyone else). Don't call them from the app.

---

## 7. Kipita Send

Parcels riding along on trips drivers are already making. **Gated on `flag_enabled('send')` — check it before showing any of this.** Every RPC below refuses when the flag is off, so a stale client cannot create orphan rows.

| RPC | Who | Purpose |
|---|---|---|
| `list_return_capacity` | **verified drivers only** | offer spare space on a trip |
| `create_send_request` | any signed-in user | ask to send something |
| `confirm_send_handover` | participants | confirm pickup or delivery with a code |

```kotlin
supabase.postgrest.rpc("create_send_request", buildJsonObject {
    put("p_from_location", "Nairobi")
    put("p_to_location", "Nyeri")
    put("p_ready_date", "2026-12-01")
    put("p_load_size", "boot")              // load_size enum
    put("p_item_category", "documents")
    put("p_item_description", "Sealed envelope, A4")
})
```

`list_return_capacity` takes `p_from_location, p_to_location, p_depart_date, p_depart_time = null, p_vehicle_type = 'car', p_max_load = 'boot', p_price_from = null, p_capacity_note = null, p_vehicle_id = null`. A passenger account calling it gets `42501 — Only verified drivers can offer space`.

Handover is code-based: `send_bookings` carries a `pickup_code` and a `delivery_code`. `confirm_send_handover(p_booking_id, p_code, p_leg)` where `p_leg` is `pickup` or `delivery`. The codes are the proof the parcel changed hands — do not build your own confirmation.

`send_prohibited_items` is a readable table. Show it before anyone describes a parcel; it is the legal basis for refusing one.

---

## 8. Reads

Read tables directly. RLS already scopes the rows to the caller.

| Table | Who can read |
|---|---|
| `trips`, `users`, `announcements`, `alert_*`, `cities`, `faqs` | everyone, signed in or not |
| `bookings` | participants and admins |
| `payments` | the payer |
| `driver_profiles` | the owner and admins |
| `notifications`, `support_cases`, `wallets`, `wallet_transactions` | the owner |

```kotlin
supabase.from("trips").select(Columns.raw("""
    id, from_location, to_location, departure_date, departure_time,
    seats_available, seats_total, price_per_seat, preferences,
    driver:users!driver_id ( id, full_name, avatar_url, is_verified, rating ),
    vehicle:vehicles!vehicle_id ( make, model, color, plate_number )
""")) {
    filter {
        eq("status", "posted")
        gte("departure_date", today)
        ilike("from_location", "%Nairobi%")
    }
    order("departure_date", Order.ASCENDING)
}.decodeList<Trip>()
```

> **Column-grant trap.** `public.users` is granted column by column. Selecting an ungranted column — `phone` is the one that bites — makes Postgres deny **the whole table** with `42501`, not just that field. If a `users` join suddenly 403s, check the column list before suspecting RLS. This has caused two production outages.

### Enums

| Type | Values |
|---|---|
| `booking_status` | `requested, pending_payment, confirmed, in_progress, completed, cancelled, rejected` |
| `trip_status` | `posted, active, in_progress, completed, cancelled` |
| `payment_status` | `pending, processing, completed, failed, refunded` |
| `escrow_status` | `none, held, released, refunded, refund_pending` |
| `kyc_status` | `not_submitted, pending, approved, rejected` |
| `notification_type` | `ride_match, request_match, payment_success, payment_failed, trip_started, trip_completed, new_message, new_alert, system` |
| `load_size` | `small_parcel, boot, pickup_load, large_heavy` |
| `vehicle_class` | `car, suv, pickup, closed_van, truck` |
| `send_status` | `open, matched, collected, in_transit, delivered, cancelled, disputed` |

---

## 9. Realtime

These tables are in the `supabase_realtime` publication:

`trips`, `bookings`, `messages`, `notifications`, `announcements`, `support_cases`, `support_case_messages`, `wallets`, `wallet_transactions`, `wallet_withdrawals`

Subscribe to `bookings` filtered on your user id and you get the whole passenger journey — *waiting → accepted → paid* — with no polling:

```kotlin
val channel = supabase.channel("my-bookings")
channel.postgresChangeFlow<PostgresAction>("public") {
    table = "bookings"
    filter("passenger_id", FilterOperator.EQ, myAppUserId)
}.onEach { action -> refresh() }.launchIn(scope)
channel.subscribe()
```

Same pattern on `driver_id` gives a driver live seat requests.

---

## 10. Storage

| Bucket | Public | Use |
|---|---|---|
| `avatars` | yes | profile photos |
| `vehicle-media` | yes | vehicle photos |
| `alert-media` | yes | road alert images |
| `chat-media` | yes | chat attachments |
| `support-media` | **no** | support attachments, signed URLs only |

```kotlin
supabase.storage.from("avatars").upload("$appUserId/profile.jpg", bytes, upsert = true)
val url = supabase.storage.from("avatars").publicUrl("$appUserId/profile.jpg")

// support-media is private
val signed = supabase.storage.from("support-media").createSignedUrl("$appUserId/x.jpg", 60.seconds)
```

> Paths are keyed by **`public.users.id`**, not the auth id. The storage policies check that prefix, so the wrong id gives you a 403 upload.

---

## 11. Errors

RPCs raise Postgres exceptions. Branch on the SQLSTATE, not the message — the copy will change.

| SQLSTATE | Meaning | Suggested copy |
|---|---|---|
| `28000` | Not signed in | "Sign in to continue." |
| `22023` | Illegal state or bad input | "This ride is no longer taking bookings." |
| `42501` | Not permitted — not yours, your own ride, or not verified | "Only the driver can do that." |
| `53400` | Not enough seats | "Those seats have just gone." |
| `55006` | Clashes with a ride you already have | "You already have a seat booked around that time." |
| `P0002` | Not found | "This ride is no longer available." |
| `54000` | Posting throttle, five trips per hour | "You've posted a few times this hour." |

```kotlin
try { requestSeat(tripId, 2) }
catch (e: PostgrestRestException) {
    when (e.error) {
        "53400" -> showSeatsGone()
        "42501" -> showNotAllowed()
        else -> showGeneric()
    }
}
```

---

## 12. A complete passenger journey

```kotlin
val me = currentAppUser()                                    // public.users.id
val trips = searchTrips(from = "Nairobi", to = "Nyeri", on = date)
val booking = requestSeat(trips.first().id, seats = 2)       // status: requested
// → driver accepts; your realtime subscription fires        // status: pending_payment
supabase.functions.invoke("initiate-payment", buildJsonObject {
    put("booking_id", booking.id); put("method", "mpesa"); put("phone", msisdn)
})
// → passenger enters PIN; Safaricom calls our callback      // status: confirmed
// → driver starts and completes the ride                    // in_progress → completed
```

---

## 13. Known gaps — coordinate before you build on these

Closed since the first version of this guide: the fee is now managed and client-readable (§6), Kipita Send exists (§7), and driver approval has an admin screen with `set_driver_approval` behind `is_admin()`.

Still open:

- **Push is Expo-only.** The `notifications` trigger still posts to `exp.host`, which nothing listens to now that mobile is Kotlin. **FCM/APNs needs that trigger rewritten — this is a joint piece of work, talk to us before you add a token table.** Until it lands, nothing reaches a user who does not have the app open. That includes the ride-cancellation notices `cancel_trip` writes.
- **No chat.** `conversations` and `messages` are migrated and unused. `ride_chat` is flagged on, which means nothing yet. Scoped to appear while a ride is live, not as a standalone inbox.
- **`send` is flagged on for preview** and must be off before public launch. Build behind `flag_enabled('send')` and it costs you nothing when it flips.
- **`publish_before_approval` is on**, so `publish_trip` still accepts any driver with a `driver_profiles` row, approved or not. When it flips off, unapproved drivers start getting `42501` from `publish_trip`. Handle that error now rather than when it changes.
- **Escrow release is unproven from any client.** `complete_trip` moves bookings, but the `release-escrow` function has no confirmed caller, so money may not actually reach drivers at the end of a ride. We are checking this. Do not assume completion pays out until we confirm.

---

## 14. Where the rules live

| What | File |
|---|---|
| Seat holding, expiry | `supabase/migrations/034_seat_protection.sql` |
| Write lockdown, RLS | `supabase/migrations/035_lock_down_writes.sql`, `036_column_grants_and_kyc_rpc.sql` |
| Ride lifecycle RPCs | `supabase/migrations/038_ride_flow_rpcs.sql` |
| Settings, flags, admin audit | `supabase/migrations/039_settings_flags_audit.sql` |
| Driver approval, `fare_breakdown` | `supabase/migrations/040_driver_approval_and_fee.sql` |
| Kipita Send | `supabase/migrations/041_kipita_send.sql` |
| Booking clash rules (`55006`) | `supabase/migrations/043_overlap_not_count.sql` |
| Ride cancellation, refunds | `supabase/migrations/044_cancel_trip.sql` |
| Payment, escrow, refunds, email | `supabase/functions/*` |

**If a rule needs to change, it changes in the migration — not in either client.** That is the whole point of this arrangement: one implementation, two apps, no drift.

Questions, or something here that doesn't match what you see: raise it with the web team rather than working around it. A workaround in the app is how the old Expo client ended up with its own private copy of the booking rules.
