# Design

Written at the finish of the `/publish` redesign (2026-10-16). It records the
incumbent Kipita web system as the build found it, plus the control vocabulary
that redesign added. It is not a rebrand: every colour here already existed in
`lib/nocturne.ts`.

## Tokens

Colour is token-only. `lib/nocturne.ts` defines one set for light and one for
dark; components reference `nocturne.*`, never a literal. Never introduce a hex
value in a component.

| Role | Light | Dark | Used for |
|---|---|---|---|
| `bg` | `#f8f6ef` | `#0C0F0D` | the page ground |
| `cream` | `#112b22` | `#faf8f4` | full ink: values, headings, body that matters |
| `muted` | `#40564e` | `#C4C8C4` | connective text, secondary lines |
| `muted-2` / `muted-3` | `#5f6e66` / `#637269` | — | captions, placeholders |
| `accent` | `#174d3b` | `#9ec5a2` | rules, selected fills, focus rings |
| `green` | `#174d3b` | `#2f6c4f` | committed colour fields (the clock board, commit pills) |
| `lime` | `#d8ed85` | `#e5ffc3` | the one highlight inside a green field |
| `cta-bg` / `cta-fg` | `#ea7747` / `#14301f` | `#e5ffc3` / `#14392a` | exactly one primary action per page |
| `surface` / `surface-2` / `surface-3` | `#fffefb` / `#eaf3e7` / `#f1f5ee` | — | tone steps, never a border plus a shadow |

**Contrast pin.** `controls.tsx` derives its rule colour as
`color-mix(in oklab, var(--n-accent) 58%, transparent)`. Over `--n-bg` that is
**3.06:1** — it clears SC 1.4.11 by 2%. Warming the cream ground or lightening
the accent breaks non-text contrast silently. Re-measure if either moves.

## Type

Two faces, both already loaded: **Manrope** (`--font-manrope`) for display and
for anything that states a value, **DM Sans** (`--font-dm`) for running text and
UI. Headings pick up Manrope globally in `GlobalStyle`.

- Display on a task surface: `clamp(29px, 5vw, 58px)`, rising to
  `clamp(58px, 4.4vw, 82px)` above 1400px. Tracking `-0.03em`, leading 1.16–1.22.
- The hierarchy inside a sentence is weight plus colour, never size: connectives
  at 500 in `muted`, editable values at 800 in `accent`. The hue is what marks a
  word as tappable, so neutral ink is reserved for text you cannot change.
  Hover deepens with `color-mix(in oklab, var(--n-accent) 68%, var(--n-cream))`,
  which darkens in light mode and brightens in dark.
- Tabular figures wherever numbers change in place.

## Control vocabulary (`components/publish/controls.tsx`)

The publish surface replaced panelled cards and chips with ruled text. Reuse
these before inventing a control:

- `Choice` — an option is a word, not a chip: display face at 21px, a 2px rule
  underneath at rest, a filled `accent` block with `onGreen` text when selected.
  No border, no card.
- `Choices` — the wrap container, `6px 18px` gaps.
- `BareInput` / `BareField` — an input is a label and an underline. 2px rule at
  rest, 3px `accent` plus a `surface-2` wash on focus. Never a boxed field.
- `TextAction` — a quiet secondary toggle: ruled word, body face.
- `CommitAction` — the terminal action inside an editor: a filled `green` pill
  with `onGreen` text and an arrow. One per editor.
- `EditorRule` / `EditorLabel` — a hairline and a 17px heading are the whole
  chrome of an editing region. There is no panel.

Three action tiers, in order of weight: ruled option → ruled toggle →
green commit pill → the single orange page action.

## Rules the surface holds to

- One live layer. Exactly one editor is open, on the page ground. No nested
  containers, no card inside a card.
- Elevation is declared once: a tone step or a rule, never both.
- Focus is always visible: 3px `accent` outline at 2–3px offset, or a 3px rule
  on bare inputs. Never removed without a replacement.
- Targets: 44–48px for standalone controls; inline sentence targets clear 24px
  (single-character values take `min-width: 28px`).
- Motion is one authored moment plus mechanical numbers: values land with a
  0.28s rise, counters roll (`components/ui/Counter.tsx`), editors enter at
  0.22s. `GlobalStyle` neutralises all of it under `prefers-reduced-motion`.
- No emoji anywhere. Icons come from `components/icons` only.
- Money is always `KES 1,200`, and a figure shown to a driver says whose money
  it is and what comes off it.

## Where this is implemented

`components/publish/PublishDeclaration.tsx` (the surface),
`components/publish/WhenPicker.tsx` (day strip, departure-board clock),
`components/publish/controls.tsx` (the vocabulary above).
The direction contract for the surface is in
`.impeccable/surfaces/components-publish-publishwizard-tsx.md`.
