---
name: kipita-illustration
description: How to draw Kipita icons and illustrations - grid, stroke, token colour, the three art families, and the Figma-to-SVG workflow. Load before drawing any glyph, spot, scene or empty-state art.
---

# Kipita illustration

## Icons

The set lives in `apps/web/components/icons` and is built with `createIcon(name, draw, { viewBox })` from `createIcon.tsx`.

- 24 grid, `viewBox="0 0 24 24"`. Stroke 1.75 regular, 2.25 bold. Round caps and joins. `fill="none"`.
- The fill weight draws the solid shape: inside `draw(filled)`, spread `SOLID` on the shapes that fill.
- Optical size: keep the glyph inside a 20x20 live area, centred. Match the stroke ends and corner radii of neighbours like `Car`, `MapPin`, `Wallet`.
- Sizes in use: 16 inline, 20 in controls, 24 default, 30 on cards, 44 in states.
- Glyphs still to draw: `CaretUp`, `CloudOffline`, `Backspace`, `Fingerprint`.

Check a new glyph at 16px and 24px, in both themes, beside three existing glyphs, before adding it to `index.tsx`.

## Illustration

Three families share one language. Do not start a fourth.

| Family | Where | Size |
|---|---|---|
| `ui/MoneyArt.tsx` | spots inside drawers and payment steps | 180x128 |
| `ui/StatusArt.tsx` | error, empty and not-found states | per component |
| scene art | a state the user is waiting inside | 320x180 |

Style: geometric, flat, no perspective, no gradient. Primary stroke 2.6, secondary 2, round caps. Depth is one ground ellipse at 7-8% opacity, never a shadow. Fills sit at 0.07-0.2 opacity under their own stroke.

Colour: CSS classes only, mapped to tokens: `.ink` (`cream`), `.accent` (`accent`), `.cta-fill` / `.on-cta` (the one highlight), `.surface` (`surface2`). One drawing serves both themes. A stopped or failed state swaps `accent` for `muted2`; the copy carries the bad news, not red.

Every illustration is `aria-hidden` and `focusable="false"`. The sentence beside it carries the meaning. Never put information only in a drawing. Never illustrate a dense list.

Motion: one loop per scene, from `kipita-motion`. Off under reduced motion.

## Workflow

1. Write one sentence for what the drawing must say. If the sentence alone is enough, do not draw.
2. Draft with the Figma MCP: `generate_vector_illustration` (load `figma:figma-use` first), prompt with the style rules above and the size.
3. Export SVG. Hand-clean: remove transforms and groups you do not need, round coordinates to 0.5, replace every colour with a class.
4. Build it as a component next to its family, sized with `width: 100%` and a `max-width`.
5. Screenshot it in light and dark at 390px with the Playwright MCP. Compare against one existing piece from the same family.
