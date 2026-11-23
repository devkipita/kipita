---
name: kipita-data
description: How apps/web reads and writes data - server components, parallel fetches, caching, realtime, server actions vs RPC, and the Supabase traps that have caused outages. Load before changing anything under apps/web/lib or any fetch in a page.
---

# Kipita data

## Where code goes

| Need | Place |
|---|---|
| Read on page load | server component, through `lib/supabase/server.ts` (`cache()`-wrapped client) |
| Read that rarely changes (FAQs, popular routes, platform settings) | `unstable_cache` with a tag, as in `lib/landing.server.ts` |
| Live updates | browser client + realtime channel, in a hook, filtered, removed on unmount |
| A write with a business rule | Postgres RPC or edge function. Kotlin calls the same thing |
| Wiring a form to that write | server action that calls the RPC and revalidates |

## Rules

- Independent reads go in one `Promise.all`. Sequential `await`s only when the second needs the first.
- Errors surface. A failed query returns an error the page renders. Never seed, demo or mock rows. `lib/rides.ts` once showed invented drivers on error; do not repeat it.
- Select lists name only columns that exist live. When a new migration adds columns, the code that selects them ships after the migration is on prod.
- `users` has column-level grants. One ungranted column in a select denies the whole table with `42501`. Check `information_schema.column_privileges` through the Supabase MCP.
- Realtime: subscribe with a `filter` (`driver_id=eq.<id>`, `booking_id=eq.<id>`), never to a whole table for every user. Debounce refetches triggered by events.
- Flags and settings come from `lib/platform.ts` (`flagOf`, `settingOf`). A feature behind a flag checks it on the server and in the client.
- Money figures shown before booking come from `bookingBreakdown` in `lib/platform.ts`, which mirrors the database's `bookings_set_price`. The database is the authority.
- Maps and Routes API calls that cost money run on the server with a server-only key and a cache, not per viewer in the browser.

## Streaming a page

- `page.tsx` awaits only identity. It starts every other read without `await` and renders the real shell at once.
- Each section that needs data is an async server component (or a client component calling `use()` on a promise) inside its own `<Suspense fallback={<SectionSkeleton />}>`. Sections stream in independently.
- `loading.tsx` renders the same shell components as the page plus the section skeletons. It never hand-draws or shimmers a heading.
- Wrap shared reads in React `cache()` so two sections asking for the same row share one query.
- Every awaited query has an index matching its `where` and `order by`, a `limit` on lists, and a select list that names only shown columns. Confirm with `explain` through the Supabase MCP.

## Before you finish

- `yarn workspace @kipita/web typecheck` is green.
- The page renders its error state when the anon key is wrong.
- No request waterfall in the Network panel for the page you touched.

For React and Next.js performance depth, load `vercel-react-best-practices`.
