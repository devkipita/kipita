---
paths:
  - "apps/web/components/**"
  - "apps/web/app/**"
---

# Web UI rules

Load the `kipita-design` skill before changing any component. Load `kipita-motion` before adding or changing any transition, keyframe or GSAP call. Read `docs/DESIGN.md` › Guards before any UI build; it is a checklist, not background.

- Reuse before building. Check `components/ui`, `components/anim`, `components/publish/controls.tsx` and `components/icons` first. One component per job.
- Colour: `nocturne.*` only. A new colour means a new token in `lib/nocturne.ts`, light and dark, never a literal.
- Field borders use the `outline`-strength rule (3:1 or better against the field). Tertiary text uses `muted2`, never `line`.
- Targets: 44px minimum for standalone controls, 48px hit area on phones. Chips stay 28-32px visual and reach 44px through a `::after` hit area under `(pointer: coarse)`. Text never below 12px; anything typed is 16px.
- Chips (pick a value) are 8px-radius, `4px 12px` padded; buttons (do a step) are pills at 40-48px. Never make them look alike.
- Hover changes tone only: no lift, no glow, no icon spin or scale, and never a tint of the icon's own colour behind it.
- Every surface ships its loading, empty and error states. Skeletons come from `ui/Shimmer`; errors from `ui/StatusPage` / `ui/StatusArt`.
- `next/image` for every remote or static image. Raw `<img>` only for `blob:` previews.
- Heavy client islands (maps, KYC form, publish variants) load with `next/dynamic`.
- Pages are server components. `"use client"` goes on the smallest leaf that needs it.
- Check both breakpoints (390px, 1280px), both themes, and reduced motion before calling it done.
- The PostToolUse hook runs `tools/design-check` on every file you edit. Fix what it reports; do not add to the baseline. Paths in `tools/design-check/strict.json` allow zero findings; a redesigned surface joins that list.
