---
paths:
  - "supabase/functions/**"
  - "apps/web/lib/payments*"
  - "apps/web/lib/wallet*"
  - "apps/web/components/**/Payment*"
  - "apps/web/components/wallet/**"
---

# Money rules

This code moves real KES. Read it twice.

- The acting user comes from `auth.getUser(jwt)` on the `Authorization` header. A missing or invalid token is a 401. The pattern is `supabase/functions/withdraw-wallet/index.ts`.
- Amounts come from the booking or the wallet row in the database. Never from the request body.
- Payout phone numbers come from the user's verified phone. Never from the request body.
- Every state change is conditional on the current state (`.eq('status', 'processing')`) so a replayed callback changes nothing.
- A Daraja request being accepted is not a payment being made. Status moves to `paid` only on the result callback.
- Escrow is released only for a `completed` booking, by the server, never from a browser.
- Any path that takes money for a booking that no longer exists must refund it to the wallet in the same transaction.
- Money in the UI is always `KES 1,200`, and says whose money it is and what comes off it.
