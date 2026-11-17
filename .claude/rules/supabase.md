---
paths:
  - "supabase/**"
---

# Supabase rules

Load the `kipita-supabase` skill before writing a migration or touching an edge function.

- Migrations are append-only and numbered. Never edit one that has been pushed; write the next number.
- Every new table: `ENABLE ROW LEVEL SECURITY` in the same migration, plus explicit policies.
- Every `SECURITY DEFINER` function: `SET search_path = public`, then `REVOKE EXECUTE ... FROM PUBLIC, anon` and grant only the roles that need it.
- No seed or demo data in `supabase/migrations`. It goes in `supabase/seed.sql`, which never runs on prod.
- `supabase/config.toml` is the source of truth for `verify_jwt`. Only callback endpoints called by Safaricom are `verify_jwt = false`.
- Push to staging, verify with the Supabase MCP, then push to prod. Record the result in `docs/LAUNCH.md`.
