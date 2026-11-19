---
name: kipita-supabase
description: Kipita Supabase workflow - writing migrations, RLS and SECURITY DEFINER checklist, edge function auth, staging-then-prod, verifying live state with the Supabase MCP. Load before any change under supabase/.
---

# Kipita Supabase

One Supabase project serves web and the Kotlin app. Rules written here protect both clients; rules written anywhere else protect only one.

## Projects

| Env | Ref | Use |
|---|---|---|
| prod | `opijacwnzkmzhaebquym` | live. Read-only through MCP |
| staging | see `supabase/config.toml` and `docs/LAUNCH.md` | every migration lands here first |

## Migration workflow

1. Check live state first with the Supabase MCP: `pg_tables`, `pg_policies`, `pg_proc`, `information_schema.column_privileges`. The migration history has lied before.
2. Write the next numbered file. Never edit a pushed one.
3. Apply to staging. Re-run the checks. Exercise it with the anon key and with a signed-in user's JWT.
4. Apply to prod. Re-run the checks. Record the number and date in `docs/LAUNCH.md`.
5. Only now merge code that depends on it.

## Checklist for every migration

- New table: `ENABLE ROW LEVEL SECURITY` in the same file, policies for each verb it allows.
- `SECURITY DEFINER` function: `SET search_path = public`, `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon`, `GRANT EXECUTE ... TO authenticated` only if a client should call it, and check the caller inside (`auth.uid()`, `is_admin()`).
- Column grants on `users`: grant new readable columns explicitly; never grant personal data to `anon`.
- No seed data. Seeds live in `supabase/seed.sql`.
- Realtime: add a table to `supabase_realtime` only if its RLS is right, because realtime respects it.
- Scheduled work runs with `pg_cron`, written in a migration, not by hand in the dashboard.

## Edge functions

- Identity: copy the pattern in `withdraw-wallet/index.ts` - read `Authorization`, `auth.getUser(jwt)`, look up `users` by `auth_id`, 401 if any step fails.
- Amounts and payout phones come from the database.
- State changes are conditional on current state so replays are no-ops.
- Daraja callbacks carry the shared secret in `?s=`; check it first, never log the full URL.
- `verify_jwt` per function lives in `supabase/config.toml`. Only Safaricom callbacks are `false`.
- Deploy with `supabase functions deploy <name> --project-ref <ref>`, staging first.

For Postgres depth load `supabase-postgres-best-practices` (indexes, RLS performance, locking, `security-privileges`), and `migration` for reversible transitions.
