---
paths:
  - "apps/web/components/**"
  - "apps/web/app/**"
---

# Web UI rules

Load the `kipita-design` skill before changing any component. Load `kipita-motion` before adding or changing any transition, keyframe or GSAP call.

- Reuse before building. Check `components/ui`, `components/anim`, `components/publish/controls.tsx` and `components/icons` first. One component per job.
- Colour: `nocturne.*` only. A new colour means a new token in `lib/nocturne.ts`, light and dark, never a literal.
- Field borders use the `outline`-strength rule (3:1 or better against the field). Tertiary text uses `muted2`, never `line`.
- Targets: 44px minimum for standalone controls, 48px hit area on phones. Text never below 12px; anything typed is 16px.
- Every surface ships its loading, empty and error states. Skeletons come from `ui/Shimmer`; errors from `ui/StatusPage` / `ui/StatusArt`.
- `next/image` for every remote or static image. Raw `<img>` only for `blob:` previews.
- Heavy client islands (maps, KYC form, publish variants) load with `next/dynamic`.
- Pages are server components. `"use client"` goes on the smallest leaf that needs it.
- Check both breakpoints (390px, 1280px), both themes, and reduced motion before calling it done.
- The PostToolUse hook runs `tools/design-check` on every file you edit. Fix what it reports; do not add to the baseline.
