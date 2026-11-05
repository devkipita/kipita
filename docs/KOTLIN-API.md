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

Seats are held from `accept_booking`, returned by `cancel_booking` or by the expiry sweep. A `pending_payment` hold carries `expires_at`, 30 minutes by default.

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

## 6. Reads

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

---

## 7. Realtime

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

## 8. Storage

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

## 9. Errors

RPCs raise Postgres exceptions. Branch on the SQLSTATE, not the message — the copy will change.

| SQLSTATE | Meaning | Suggested copy |
|---|---|---|
| `28000` | Not signed in | "Sign in to continue." |
| `22023` | Illegal state or bad input | "This ride is no longer taking bookings." |
| `42501` | Not permitted — not yours, your own ride, or not verified | "Only the driver can do that." |
| `53400` | Not enough seats | "Those seats have just gone." |
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

## 10. A complete passenger journey

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

## 11. Known gaps — coordinate before you build on these

- **Push is Expo-only.** The `notifications` trigger posts to `exp.host`. FCM/APNs needs that trigger rewritten. Talk to us first.
- **No chat yet.** `conversations` and `messages` are migrated and unused; planned to appear when a ride is live.
- **Kipita Send does not exist.** No tables, no RPCs.
- **The platform fee is 12%**, currently an env var on the escrow function and not readable by clients. A managed, admin-editable rate is planned — **do not hard-code 12 in the app.**
- **No admin approval screen yet**, so `driver_profiles.approval_status` is set out of band. `publish_trip` currently accepts any submitted driver, not only approved ones. That tightens later.

---

## 12. Where the rules live

| What | File |
|---|---|
| Seat holding, expiry | `supabase/migrations/034_seat_protection.sql` |
| Write lockdown, RLS | `supabase/migrations/035_lock_down_writes.sql`, `036_column_grants_and_kyc_rpc.sql` |
| Ride lifecycle RPCs | `supabase/migrations/038_ride_flow_rpcs.sql` |
| Payment, escrow, refunds, email | `supabase/functions/*` |

**If a rule needs to change, it changes in the migration — not in either client.** That is the whole point of this arrangement: one implementation, two apps, no drift.

Questions, or something here that doesn't match what you see: raise it with the web team rather than working around it. A workaround in the app is how the old Expo client ended up with its own private copy of the booking rules.
