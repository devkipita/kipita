# Kipita

Kipita sells the empty seats in cars already driving between Kenyan towns, and holds the fare in M-Pesa escrow until the ride is done. This repo is the **web app** (`apps/web`, Next.js 15 App Router, React 19, styled-components 6) and the **shared Supabase backend** (`supabase/`). A separate Kotlin app uses the same backend.

`apps/mobile` (Expo) is dead. Never read it as current, never add to it.

## Where truth lives

| Question | Source |
|---|---|
| What we build and for whom | `apps/web/PRODUCT.md` |
| Colour, type, space, motion, icons | `docs/design/kipita-design-system.html` (binding), then `apps/web/DESIGN.md` |
| Token values in code | `apps/web/lib/nocturne.ts` |
| Launch status, gates, open defects | `docs/LAUNCH.md` |
| Live schema, RLS, functions | the Supabase MCP, never the migration history alone |

If the migration history and the live schema disagree, believe the schema.

## Commands

Run from the repo root. Bash on this machine fails to fork; use PowerShell.

```
yarn web                      # dev server
yarn workspace @kipita/web typecheck
yarn workspace @kipita/web lint
yarn workspace @kipita/web build
node tools/design-check/index.mjs [files...]   # design rules; no args = whole app vs baseline
supabase db push --linked     # staging first, always
```

`.claude/rules/` holds path-scoped rules for web UI, data, Supabase and money code. They load when you touch matching files.

## Hard rules

1. No code comments. Names carry intent.
2. No emoji in UI. Icons come from `apps/web/components/icons` only.
3. Colour from `nocturne.*` tokens only. No hex or rgba in components.
4. Exactly one `cta` (orange, lime in dark) action per screen.
5. Never fall back to sample data on error. Show the error state.
6. Nothing the platform cannot prove: no invented ratings, counts, drivers or testimonials.
7. Identity comes from the JWT, price from the database. Never from a request body.
8. Business rules live in Postgres (RLS, RPC, triggers) or edge functions, because Kotlin shares them. Not in server actions.
9. Migrations go to staging, get verified, then go to prod.
10. Buttons name the action: "Cancel ride", not "Cancel". No `window.confirm`; use `useConfirm` from `components/ui/ConfirmPop.tsx`.
11. Commits carry no AI attribution. Author is Dennis.
12. Fix the cause at the narrowest layer. No speculative abstraction, no duplicate component for a job one already does.

## Skills to load

| Job | Skill |
|---|---|
| Any UI work | `kipita-design`, then `impeccable` or `emil-design-eng` for depth |
| Any motion | `kipita-motion`, then `animate` / `choreograph` / `animation-performance` |
| Drawing an icon or illustration | `kipita-illustration` |
| Fetching, caching, realtime, server actions | `kipita-data`, then `vercel-react-best-practices` |
| Migrations, RLS, edge functions, payments | `kipita-supabase` |
| Before calling anything done or shippable | `kipita-ship` |
| Stress-testing a component | `break-ui` |

## MCP

- `supabase-prod`: read-only against prod. Needs `SUPABASE_ACCESS_TOKEN` in your environment. Use it to check tables, policies, grants and functions before and after a migration. A `supabase-staging` entry joins once the staging project exists.
- `kipita`: `design_tokens`, `check_design_rules`, `launch_gates`.
- Figma: drafting illustrations and mocking surfaces. Playwright: verifying UI at 390px and 1280px.
