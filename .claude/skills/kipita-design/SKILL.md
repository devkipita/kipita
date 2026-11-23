---
name: kipita-design
description: Kipita web visual rules - tokens, type, space, controls, copy and the done-checklist. Load before building or changing any UI in apps/web.
---

# Kipita design

The binding source is `docs/design/kipita-design-system.html` (v1.0, 11 Nov 2026). Its principle: web is the reference, with fixes marked. `docs/DESIGN.md` records the control vocabulary and illustration language, and its **Guards** section is the anti-slop contract: read all of it before building, every time. `docs/PRODUCT.md` says who it is for. Read the section you need; do not guess.

Ask the `kipita` MCP for exact values: `design_tokens` returns every role with light and dark hex and its `nocturne` name.

## Five principles

1. Phone first, outdoors, in a hurry. 48px hit areas, text 12px or larger, inputs 16px, 4.5:1 for anything read.
2. One action per screen. Exactly one `ctaBg` button: the step that moves the journey forward. Everything else is green, tonal or ruled.
3. Money is explicit. `KES 1,200`. Say what the passenger pays, what the driver earns, and where the money is now.
4. Specifics beat decoration. Two towns, a real time, a real plate are the biggest things on a card. Illustration is never the hero.
5. Claim only what you can prove. No invented numbers. Status is icon plus word, never colour alone.

## Tokens

Components use `nocturne.*` from `apps/web/lib/nocturne.ts`. Design-file role to code name:

| Design role | `nocturne` | Note |
|---|---|---|
| background | `bg` | |
| onSurface | `cream` | full ink |
| onSurfaceVariant | `muted` | dark value differs from file (#C4C8C4 vs #A0A6A1); file wins at next design pass |
| mutedText | `muted2` | tertiary text, AA-safe |
| outline | none yet | add `--n-outline` (#718078 light, #878D88 dark) for field borders |
| outlineVariant | `line` | hairlines only, never a field border, never text |
| surfaceContainerLowest | `surface` | cards |
| surfaceContainerHigh | `surface3` | inset wells |
| cta / onCta | `ctaBg` / `ctaFg` | the one action |
| brand green | `green`, `greenDeep` | committed fields, hero grounds |
| highlight | `lime` | the one highlight inside a green field |

If a role has no token, add the token to `nocturneLight` and `nocturneDark` together. Never write the hex in a component.

## Type

Manrope names things: headings, amounts, times, route names, the wordmark (700, 800). DM Sans is read and operated: body, labels, buttons, fields (400, 500, 600). Amounts and times use `font-variant-numeric: tabular-nums`. Sentence case everywhere. Hierarchy inside a sentence is weight plus colour, never size.

## Space, shape, depth

4px grid, 16px phone gutter. Depth is a tone step or a rule, never both, and never a card inside a card. Shadows only on things that float: sheets, popovers, the tab bar.

## Controls

Reuse before inventing: `components/publish/controls.tsx` (`Choice`, `Choices`, `BareInput`, `BareField`, `TextAction`, `CommitAction`, `EditorRule`, `EditorLabel`), `components/ui` (`Drawer`, `ConfirmPop`, `Switch`, `AmountField`, `PhoneField`, `Shimmer`, `StatusPage`). Action weight, light to heavy: ruled option, ruled toggle, green commit pill, the single orange page action. Buttons must look finished at rest; no grey transparent text buttons. Chips pick a value and are small 8px-radius rectangles (`4px 12px`, 28-32px tall); buttons do a step and are pills. Spec table in `docs/DESIGN.md` › Guards › Chips are not buttons.

## Copy

Plain Kenyan English, second person, no hype. Buttons name the action ("Cancel ride", "Pay KES 800 with M-Pesa"). No paragraphs on task surfaces. UI grows from what is already on screen; nothing appears from nowhere.

## Done checklist

Run every line before saying a surface is finished.

- [ ] 390px and 1280px, light and dark (Playwright MCP, screenshot both)
- [ ] 200% text zoom does not clip or overlap
- [ ] Reduced motion: no transform animates, state still readable
- [ ] Keyboard: every control reachable, focus visible (3px accent ring)
- [ ] Loading, empty and error states exist and look designed
- [ ] Worst-case data: long names, 0 and 999 counts, missing photo (`break-ui` skill)
- [ ] Exactly one `ctaBg` on the screen
- [ ] Every interactive element has every row of the Guards state table (rest, hover, focus-visible, active, selected, disabled, loading, error)
- [ ] Every icon matches its Material Symbols meaning and stays full ink on hover
- [ ] Skeleton is the final layout minus content; swapping moves nothing
- [ ] `node tools/design-check/index.mjs <files>` reports nothing new
- [ ] A redesigned surface: `node tools/design-check/index.mjs --strict <dir>` is clean and the dir is in `tools/design-check/strict.json`

For deeper critique load `impeccable` (audit, polish, distill) or `emil-design-eng` (interaction polish). For accessibility load `design:accessibility-review`.
