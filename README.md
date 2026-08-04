# Kipita

Carpooling, made for Kenya. This is the Kipita monorepo — the mobile app, the
web/marketing/admin site, shared logic, and the Supabase backend.

## Structure

```
kipita/
├── apps/
│   ├── mobile/      # Expo (React Native) app — riders & drivers
│   └── web/         # Next.js — marketing site, legal pages, admin panel
├── packages/
│   └── shared/      # Shared domain types + escrow/fee business logic
├── supabase/        # Migrations + edge functions (shared backend)
└── package.json     # Yarn workspaces root
```

- **`@kipita/mobile`** — the Expo app (was previously the repo root).
- **`@kipita/web`** — Next.js App Router: a visual landing page, legal
  policies (`/legal/*`), and the admin panel (`/admin`) for reviewing refunds
  and, later, support/reporting.
- **`@kipita/shared`** — the single source of truth for the platform fee and
  shared types, consumed by the web app (and available to mobile). Ships raw TS;
  the web app transpiles it via `transpilePackages`, Metro via `watchFolders`.
- **`supabase/`** — Postgres migrations and Deno edge functions, shared by both
  apps. Kept at the repo root because it's backend infrastructure, not an app.

## Getting started

Requires Node 20+ and Yarn 4 (Berry — already vendored under `.yarn/`).

```bash
# From the repo root — installs every workspace and links them.
yarn install
```

### Mobile (Expo)

```bash
yarn mobile            # expo start
yarn mobile:ios        # expo start --ios
yarn mobile:android    # expo start --android
```

Environment lives in `apps/mobile/.env` (see `.env.example`).

### Web (Next.js)

```bash
cp apps/web/.env.example apps/web/.env.local   # fill in Supabase keys
yarn web               # next dev  → http://localhost:3000
yarn web:build         # production build
```

The web app talks to the **same Supabase project** as mobile.

## Admin panel

`/admin` is gated to users with `is_admin = true`. To grant yourself access:

```sql
update public.users set is_admin = true where email = 'you@example.com';
```

Then sign in at `/admin/login` with your Kipita account. The refund queue
(`/admin/refunds`) approves refunds to a passenger's wallet or releases funds to
the driver — running the same `resolve-refund` edge function as the app.

## Backend

Apply migrations and deploy functions from the repo root:

```bash
supabase db push
supabase functions deploy   # or deploy individual functions
```

See `supabase/migrations/` — payment escrow (`013`) and admin-verified refunds
(`014`) are the most recent.

## Typecheck

```bash
yarn typecheck         # mobile + web
```

> Note: `supabase/functions/*` are Deno, not Node — they don't typecheck with
> the app TypeScript configs and are excluded from these commands by design.
