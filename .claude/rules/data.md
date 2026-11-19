---
paths:
  - "apps/web/lib/**"
  - "apps/web/hooks/**"
---

# Data rules

Load the `kipita-data` skill before changing fetching, caching, realtime or server actions.

- Independent reads run in `Promise.all`. A second `await` that does not use the first result is a waterfall.
- On a query error, return the error to the caller. Never return seed, demo or sample rows.
- Any select on `users` must only name granted columns. Grants live in migrations 004, 012, 014, 022, 035 and 036; confirm live with `information_schema.column_privileges` through the Supabase MCP. One ungranted column denies the whole table with `42501`.
- A select list must only name columns that exist on the live database. Check with the Supabase MCP before shipping a column from a new migration.
- Realtime subscriptions are filtered to the rows the user can act on and removed on unmount.
- New write rules go into an RPC or an edge function so the Kotlin client gets them too. A server action may call that RPC; it must not contain the rule.
