---
name: kipita-ship
description: Kipita release gate - the checks that must pass before a change is called done, merged or deployed. Load before saying any task is finished.
---

# Kipita ship gate

Run these in order. Stop at the first failure and fix it. Report each result plainly, with output when something fails.

1. `yarn workspace @kipita/web typecheck`
2. `yarn workspace @kipita/web lint`
3. `node tools/design-check/index.mjs` - no violations beyond the baseline
4. `yarn workspace @kipita/web build` - read the route size table; flag any route whose first-load JS grew
5. If a migration changed: staging and prod both show it live through the Supabase MCP, and the code that depends on it was merged after
6. UI changed: Playwright MCP at 390px and 1280px, light and dark, on every surface touched. Run the flow end to end, not just the page load
7. Money changed: run the matching check from `docs/LAUNCH.md` Verification on staging
8. Update the gate table in `docs/LAUNCH.md` if a gate moved

Budgets live in `docs/LAUNCH.md` under Budgets, with the last measured route sizes. Compare your build's route table against them. A route that grows without a reason in the change is a failure. Build into `.next-build` (`$env:NEXT_DIST_DIR='.next-build'`) so a running dev server is not clobbered.

Do not mark work done on a red step. Do not skip a step because it "probably" passes.
