---
name: kipita-motion
description: Kipita motion tokens and rules - easing, durations, press feedback, reduced motion, what never animates. Load before adding or changing any transition, keyframe or GSAP call in apps/web.
---

# Kipita motion

Motion confirms what the user did and shows where something went. It never decorates a dense list and never delays a task.

## Tokens

Values live once, in `apps/web/lib/motion.ts` (Material 3 tokens, matching the design file). New code imports the task-named aliases from `apps/web/lib/nocturne.ts`, which are computed from those values and already carry `ms`:

```ts
import { dur, ease } from "@/lib/nocturne";
transition: transform ${dur.press} ${ease.standard};
```

| Alias | M3 source | Use |
|---|---|---|
| `ease.standard` | `standard` | most state changes |
| `ease.enter` | `emphasizedDecelerate` | sheets, cards, popovers arriving |
| `ease.exit` | `emphasizedAccelerate` | anything leaving |
| `ease.spring` | `spring` | success only. Nothing else overshoots |
| `dur.press` | `short3`, 150 ms | press feedback |
| `dur.state` | `short4`, 200 ms | colour, toggles, tabs |
| `dur.enter` | `medium2`, 300 ms | sheets and cards entering |
| `dur.exit` | `short4`, 200 ms | leaving is faster than arriving |
| `dur.max` | `long2`, 500 ms | ceiling. Nothing longer |

Older files import raw tokens from `lib/motion.ts` (`dur.short4` as a number). Leave them unless you are already editing the file; then move it to the aliases. Never add a new duration or curve outside `lib/motion.ts`.

## Nothing from nowhere (hard rule)

Every element enters from something already on screen and leaves back into it. The user should always be able to answer "where did that come from?" by pointing.

| Situation | Pattern | How |
|---|---|---|
| A button opens a panel (search pill to search panel, plus to composer) | shared-element morph | the trigger and the panel share one `layoutId`; the panel grows out of the trigger's box and shrinks back into it |
| A card opens its detail (ride card to ride sheet or page) | container transform | the card's container shares a `layoutId` with the detail container; content inside crossfades |
| A menu or popover | phones: bottom sheet; desktop: grows from its trigger | `components/ui/Popover.tsx`, which switches automatically |
| The navbar account menu | grows from the avatar button on every screen size | `Popover` with `sheetOnPhone={false}` |
| A sheet or drawer | phones: rises from the bottom edge, drag down to dismiss; desktop: grows from its trigger | `components/ui/Drawer.tsx` |

On phones every overlay is a bottom sheet. The only exception is a menu that belongs to the top bar, which grows from its button.
| A list fills | stagger from the list's top, 30-40 ms apart, first 6 rows only | `choreograph` skill |
| Header or nav on scroll | scroll-linked collapse: shrinks while scrolling down, grows back on scroll up | transform only, never height |
| Route change between related screens | the shared element morphs; everything else crossfades | `layoutId` across the route, or View Transitions for full pages |
| Toast or status | slides from the edge it lives on | |

Never fade something in from the centre of the screen with no on-screen source. If no source exists, the content should already be on screen.

## Motion library

`motion` (v12) is loaded through `components/anim/MotionProvider.tsx`, mounted in `app/(app)/layout.tsx`. It uses `LazyMotion` in `strict` mode, so use `m.div` (from `motion/react-m` or `import { m } from "motion/react"`), never `motion.div`. `MotionConfig reducedMotion="user"` already drops transforms for users who ask for reduced motion.

Transitions come from `lib/motion.ts`: `spring.morph` (shared elements, default), `spring.sheet`, `spring.press`, `spring.success` (the only bouncy one), `tween.enter`, `tween.exit`, `tween.state`. CSS-only motion still uses the `dur`/`ease` aliases from `lib/nocturne.ts`.

Use Motion for shared-element morphs, presence (exit animations) and gestures. Use plain CSS transitions for hover, press and colour. Do not pull Motion into a component that only needs a CSS transition.

## Rules

- Press scales to `0.97` on buttons, `0.98` on cards. `components/ui/interactions.ts` has the shared press and hover mixins; use them.
- Animate `transform` and `opacity` only. Never `top`, `left`, `width`, `height` or `margin`. Accordions may use `grid-template-rows`.
- One documented exception: `--sticky-top` is a registered property (`GlobalStyle`) that transitions when the phone chrome collapses, so the few sticky sub-headers glide with the top bar instead of jumping. Do not add more registered-property transitions without the same reasoning written here.
- Exits mirror entries, shorter. Anything a user can toggle uses transitions, not keyframes, so it can be interrupted mid-way.
- Loops: only `dash` (a road), `pulse` (waiting), `float` (in transit) from `lib/nocturne.ts`. One loop per scene.
- No motion on keyboard-driven actions, on values that update often, or on rows in a long list.
- Numbers that change in place roll with `components/ui/Counter.tsx`.
- GSAP is for scroll reveals on marketing pages only, loaded lazily through `components/anim/Reveal.tsx`.
- Under `prefers-reduced-motion: reduce`: no transform moves, colour fades only, loops stop. `GlobalStyle` already enforces this globally; do not fight it with `!important`.
- Map markers move with `transform` or the Maps API's own position update, never by writing `left`/`top` each frame. Every `requestAnimationFrame` is cancelled on unmount.

## Which skill next

- Building a new animation: `animate`
- Several things moving together: `choreograph`
- Dropped frames or jank: `animation-performance`
- Reviewing existing motion: `review-animations`
- Too much motion: `remove-animations`
- Drag, swipe or sheet: `gestures`
