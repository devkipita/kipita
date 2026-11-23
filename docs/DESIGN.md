# Design

Written at the finish of the `/publish` redesign (2026-10-16). It records the
incumbent Kipita web system as the build found it, plus the control vocabulary
that redesign added. It is not a rebrand: every colour here already existed in
`lib/nocturne.ts`.

## Guards (2026-11-22)

These rules come from the review of the Road alerts surface. A rule tagged
`[check: id]` is enforced by `tools/design-check`. The PostToolUse hook runs it
on every edit. Paths listed in `tools/design-check/strict.json` allow zero
findings. Everywhere else, the count may not go above `baseline.json`.

Before any redesign starts, write its audit: every defect on the current
screen, the guard it breaks, and whether `tools/design-check` catches it.
A defect no check catches gets a check first, or is named as a manual
review item. Show the audit before building.
Source: "u will write rules and u will not implement until i can see you have
rules implemented that guard designs", 2026-11-23.

A redesign is done only when all of these are true:

- every file passes `node tools/design-check/index.mjs --strict <dir>`
- its directory is in `strict.json`
- every row of the state table below exists
- screenshots at 390px and 1280px, light and dark, have been looked at

### Surfaces

- **No coloured stripe on the edge of a card, row, callout or quote.** This
  means no `border-left`, no `inset` box-shadow bar and no `::before` bar.
  Separate items with a tone step or a 1px `line` hairline. Status is an icon
  plus a word. `[check: accent-stripe]`
  Why: it is the most recognisable AI-template tell, and it reads as decoration.
  Source: "dont add in my project AI slop such as the line left of the card".
- **A card in a feed is a tone step or a hairline, never a border plus a
  shadow, and it never lifts on hover.** Shadows stay on things that float:
  sheets, popovers, the tab bar.

### Chips are not buttons

| | Chip | Button |
|---|---|---|
| Job | pick a value fast: category, place, sort, filter, a quick reply | do the step: "Post alert", "Discard draft" |
| Height | 28-32px visual | 40px desktop, 44-48px phone |
| Padding | `4px 12px`. Vertical padding is 5px at most | `0 20px` |
| Radius | 8px | pill |
| Text | DM Sans 13-14px, 600 | DM Sans 15-16px, 700 |
| Icon | 16-18px leading. A 16px caret only if it opens a menu | 20px, only if it adds meaning |
| Rest | soft tonal fill from its meaning (`theme.accent[name].soft` bg, `.on` ink), no border. Neutral chips use `surface2` | filled `green`, or the one `cta` |
| Selected | the same hue one step stronger (`.bold`), plus a leading `Check` or a filled glyph, and `aria-pressed` or `aria-selected` | n/a |

- **A chip is never a pill.** It never shares a height or a radius with the
  buttons on the same screen. `[check: chip-pill, chip-size]` covers any
  styled component named `*Chip`, `*Pill`, `*Tag` or `*Badge`.
  Source: "chipset help the user make quick decisions they are not pill form
  and they are not that big they small buttons with padding top not exceeding
  5px".
- **Chips carry soft colour, never a grey outline.** Each option takes the
  soft tone of what it means. For example, a refund is money green, unsafe is a
  danger tint and weather is sky. A row of outlined grey boxes is the
  internet average. `[check: chip-outline]`
  Source: "what happened to using chipset with softcolors".
- **Chips use `ui/Chip` with an M3 container role**
  (https://m3.material.io/styles/color/roles), never a local chip. At rest:
  `*Container` fill, `on*Container` ink, no border. When selected: the role's
  solid colour with its `on*` ink, a filled glyph and `aria-pressed`. Report
  a problem on a trip:

  | Topic | Role | Icon |
  |---|---|---|
  | did not arrive / did not turn up | warning | `Clock` |
  | I need a refund | success | `HandCoins` |
  | Something felt unsafe | error | `ShieldWarning` (never `ShieldCheck`, which means safe) |
  | Something else | info | `Question` |

  Source: "improve those chipset at the bottom to have solid softcolores
  using color roles", 2026-11-23.
- **A chip's hit area still reaches 44px on touch.** Add
  `position: relative` on the chip. Then add a `::after` with `inset: -8px 0`
  inside `@media (pointer: coarse)`. The visual size does not grow.
- **A status badge is not a control.** It is 20-24px tall, padding `2px 8px`,
  radius 6px, 12-13px text, with a 16px icon. It has no hover state.

### Icons

- **An icon means what the same Google Material Symbol means.** If a person
  could read it two ways, change the icon or add a word. In this repo:

  | Meaning | Use | Never |
  |---|---|---|
  | road cleared | `CheckCircle` | `Prohibit`, `ProhibitedSmall` (those mean "blocked") |
  | still there | `Warning` | a bare tick |
  | views | `BarChart` (Kipita's own views mark; keep it) | |
  | share to WhatsApp | `WhatsappLogo` | a generic share glyph |
  | reply | `ChatCircle` | |
  | save | `BookmarkSimple`, filled when saved | |
  | place | `MapPin` | |
  | use my location | `Crosshair` | `MapPin` (that is the place, not the action) |

- **Icon sizes are 16px inline with text, 18px in a chip, 20px in a control
  and 24px standalone.** Nothing is smaller and nothing sits between.
  `[check: tiny-icon, icon-scale]` Use one stroke weight per row. A filled
  weight is only for a selected state.
- **Hover never hides an icon.** The icon keeps full ink, at least 3:1 against
  the hover background. Hover adds a neutral state layer:
  `color-mix(in oklab, var(--n-cream) 8%, transparent)`. Never tint the
  background with the icon's own colour. `[check: hover-tint]` Never fade,
  spin or scale an icon on hover. `[check: hover-moves]`
  Source: "icons that get obscured on hover ... look at google icons they make
  sense and they are visible".
- **An icon-only button has an `aria-label` that names the action.** Its box
  is 40px (44px on phones). On desktop hover it shows a tooltip. The first
  tooltip waits; neighbouring ones open instantly.
- **Pressing, selecting or focusing never changes what an icon means.** A
  filled glyph with an inner mark (`Warning`'s "!", `CheckCircle`'s tick,
  `XCircle`'s cross) cuts that mark out with `--icon-knockout`. Every
  container that can show a filled glyph sets `--icon-knockout` to its own
  background (`Chip`, `IconAction` and `CategoryBadge` already do). Never let
  it fall back to white on a white-ink fill, or the "!" and the tick
  disappear. Selected chips change tone and fill the glyph. They never swap,
  blur or squash it.
  Source: "the icons should not look distorted when clicked or on focus they
  should not lose the icon meaning", 2026-11-22.
- **One control per job.** Two controls that set the same value must not sit
  side by side, such as a location tool next to a location chip.

### Interaction states

Every interactive element ships every row that applies to it. A missing row
means the surface is not finished.

| State | Rule |
|---|---|
| rest | looks finished: a border, a fill or ink. Never grey transparent text |
| hover | tone only, inside `@media (hover: hover) and (pointer: fine)`. No lift, no glow, no grow. `[check: hover-ungated, hover-moves]` |
| focus-visible | 3px `accent` outline at 2px offset, never clipped by `overflow: hidden`. `[check: state-focus]` |
| active | `scale(0.97)` on buttons and chips, `0.98` on cards, `dur.press`. `[check: state-press]` |
| selected | a fill change plus a non-colour cue (a tick, a filled glyph or a label change), and `aria-pressed` or `aria-selected` |
| disabled | still legible. The reason is on screen ("Add a location to post"), not only a grey button |
| loading | `ButtonOrb` plus a verb in progress ("Posting"). The width does not jump |
| error | inline next to the control that failed, in words, with the fix |

Source: "u did not handle all areas starting with on hover effects spacing
correct labels correct WACG rules u impleant 19% of the design".

### Motion

Emil Kowalski's rules, via the `emil-design-eng` and `review-animations`
skills, applied to Kipita's tokens:

- **Nothing moves on hover.** `[check: hover-moves]` The `pressable` lift and
  the `scanGlyph` spin in `components/ui/interactions.ts` are retired.
- **Things change in place.** A view swap inside a card (view to edit) is a
  crossfade where it stands: opacity, plus at most 2px blur. It never slides
  out of its box. A new item enters from where the action happened. For
  example, a posted alert drops in under the composer.
- **Enter with `ease.enter` in 300ms or less. Exit faster, with
  `ease.exit`.** Never use `ease-in`, never `transition: all` and never
  `scale(0)`. Never write a literal duration or `cubic-bezier` in a component,
  including on the continuation lines of a multi-line `transition`.
  `[check: ease-in, transition-all, scale-zero, literal-motion]`
- **Anything a user can toggle uses a transition, never a keyframe**, so it
  can be interrupted.
- **Every count rolls.** Views, likes, replies, confirmations, reports and
  totals render through `RollingNumber` (`components/ui/Counter.tsx`). The
  digits count up when first seen and roll again whenever the value changes.
  Counts are live, so a feed listens for changes and the number climbs in
  front of the user. Full numbers with separators (`32,655`), never
  abbreviated. This is the one animation allowed past `dur.max`. Characters
  left while typing stay static. `[check: raw-count]`
  A rolling count sits on the same baseline as the words beside it ("4
  reports", "1 alert", "View 2 replies"). `RollingNumber` centres itself in
  the line and adds no height. Check this at 200% zoom. A digit that rides
  above its word is a bug.
  Source: "4 reports" screenshot, 2026-11-22.
  Source: "it should be animated count up as a design rule i gave u animation
  for count up that is applied to all numbers".
- **A count is an action where the platform can act on it.** Views open the
  alert, likes toggle, replies open the thread. A bare number with no target
  is a dead end.

### Loading

- **A skeleton is the final layout with the content removed.** It uses the
  same boxes, gaps and line heights: a 40px avatar circle, text bars at real
  line height (60% and 85% wide), and 20px squares for the action icons.
  Swapping it for content moves nothing.
- **Chrome is never a skeleton.** Tabs, headings, the composer and the search
  field render for real at once. Only the data area shimmers.
- **Before writing a skeleton, list what is fixed and what is loaded.**
  Fixed: page title, tab labels, section headings that always show, and
  static copy like FAQs. These render for real, using the same exported
  components as the page, so nothing moves on swap. Loaded: rows, counts,
  names, money. Only these shimmer, in the exact geometry of the real row.
  Source: "why is content which is not changing loading with the skeletons",
  `/trips`, 2026-11-22.
- **Actions follow the state and the clock.** A ride's "Start ride" appears
  only from 2 hours before departure. Before that the row says "Leaves in …".
  "Cancel ride" is a visible button among the card's actions, filled in the
  error container tone (`errorContainer` / `onErrorContainer`), not a ghost
  outline (reverted on request, 2026-11-22). It is never hidden
  in a ⋯ menu that opens like a modal, and never bare grey text. Its confirm
  grows from the button.
  Source: "why is cancel ride opening like a modal ... it should be among the
  options", 2026-11-22.
- **A driver's next ride is a seat map** (`trips/SeatMap.tsx`). Every seat
  takes an M3 role:

  | Seat | Role |
  |---|---|
  | free | `surfaceContainerHigh` (quiet, so progress stands out) |
  | requested | `warningContainer`, dashed `warning` edge, pulsing dot |
  | booked, not paid | `primaryContainer` |
  | paid | `primary` |

  Light to dark means less to more done, so the map reads as progress
  without relying on hue alone. A booked or paid seat shows the rider's
  initials and opens their booking. The driver seat is on the right (Kenya
  is right-hand drive). On a phone the ride details come first and the seat
  map below; on desktop the map sits on the left. A live change shows one
  line on the card ("Wanjiru booked seat 3") for 8 seconds.
  The legend names the four states; one "N of M booked" line carries the
  count. Do not repeat it in tiles or a second legend count.
- **The ride card opens with a green time band** (`trips/RideHero.tsx`):
  - Departure time in lime.
  - A countdown ring that fills toward when you can start ("You can start the
    ride in 13 h 58 min 12 s", digits rolling), then toward departure.
  - The route, with the car from `public/map/car.svg` driving the lime road
    from the origin dot to the destination dot on a loop. This is the card's
    one loop: requested seats get a dashed edge, no pulse.
  - A status badge only when it adds something: full, ID in review, under way.
  - On load every seat starts free, then booked and paid seats fill one by
    one.
  - Tiles carry colour roles: car on `secondaryContainer`, price on
    `tertiaryContainer`.
  - On a phone: band, tiles and actions, then seats.
  Source: "spot redundancy ... the time animation should be at the top ...
  the card lacks color ... use the car svg to animate the car moving",
  2026-11-22. Seats fill in a
  stagger on load; a seat that changes state live changes colour and pops
  once. The route always draws the road with a car between the two towns
  (and says "to" to screen readers), never two words with a gap.
  Source: "it should use color roles to show the seat booked paid and empty
  ... draw an illustration to show to or use the word to", 2026-11-22.
- **A button's colour names its job, and two jobs never share a colour.**

  | Job | Colour |
  |---|---|
  | the step forward (Share ride, Pay) | orange `cta` |
  | commit (Accept, Send report) | green |
  | view or open (Open ride) | `tone.green` |
  | find (Find a ride) | `tone.lav` |
  | say no or undo (Cancel ride, Decline request) | `errorContainer` |
  | neutral (Discard report) | `tone.surface` |

  Information tiles are not buttons and use other tones (car `tone.blue`,
  price `tone.amber`).
  Source: "u changed the colors of the buttons which made them the same yet
  they are doing different roles", 2026-11-23.
- **Every notification is a card** separated by 8px of space, never a border.
  Information is creamy white (`surfaceContainerLowest`). Warning, error,
  success and live notifications carry their role colour mixed into that
  white: stronger while unread, lighter once read. A warning is never plain
  white.
  Source: "each notification should have card like and divided not by border
  but space ... if its warning its not a white", 2026-11-23.
- **Every card shows its state in colour.** A booking card takes a soft wash
  of its status's M3 container colour and leads with a status tile (icon on
  the container tone): success for reserved, warning for payment due,
  secondary for requested, error for cancelled or declined, lime for on the
  way. Past rows carry the same tile. Cancelled is designed, not greyed out.
  Source: "even the cancellation they should look designed ... use color
  roles give the cards life", 2026-11-22.
- **Skeletons come from `ui/Shimmer` and stand still under reduced motion.**
  An error replaces the skeleton with `ui/StatusPage`, never sample data.
  `[check: skeleton-source]`

### Phone chrome

- **On phones the page title and back arrow live in the top bar, never in
  the page.** The title replaces the logo. `routeTitle` in
  `lib/nav/page-title.ts` maps every route to its title and back link, so
  a new page adds one line there. A title that depends on state renders
  `<PageTitle>`. Bottom-bar tabs (Road alerts, Publish a ride) get a title
  with no back arrow. Home keeps the logo.
- **The in-page heading stays for screen readers and desktop** and carries
  `data-bar-title`. One global rule hides it visually at 960px and below.
  Content headings are not page titles and stay visible: a person's name, a
  route, an offer.
- **The title and back arrow are `sage`, the colour of the wordmark**,
  about 6.5:1 on `greenDeep`. The back arrow is `ArrowLeft` bold, 24px, in a
  40px round `sage` 18% well (44px hit area on touch). It goes back in
  history when the user came from inside the app, and falls back to its
  link otherwise. Its `aria-label` names the destination ("Back to trips").
- **The browser's own chrome eats the screen, so ours gives space back.**
  Both bars hide on scroll down and return on scroll up. The `(app)` layout
  sets `themeColor` to `greenDeep` so the browser's bar and ours read as
  one. Every surface uses `dvh`, never `vh`. Phones get a compact hero: art
  160px at most, headline 20px.
  Source: "the Trips title on mobile should be above in navbar where the
  logo is together with the back arrow ... we have browser top and bottom
  navbar then we have your apps top and bottom navbar", "the color of the
  Titles should match logo", 2026-11-23.

### Spacing and type

- **Everything sits on the 4px grid.** 1px and 2px are allowed for hairlines
  and optical nudges. `[check: off-grid]`
- **Controls under a text field line up with the text column**, not with the
  avatar.
- **No text below 12px.** `[check: tiny-text]` **No uppercase eyebrow
  labels.** `[check: uppercase]` **No gradient text.** `[check: gradient-text]`

### Labels

- **A label names the action and its object.** `[check: generic-label]` This
  bans bare "Cancel", "Save", "Close", "Done", "Read more" and "Learn more".
- **A label never reuses a word that means something else on the same
  screen.** On Road alerts, "Clear alert" (discard the draft) collides with
  "Cleared" (the road is open). The draft action is "Discard draft".
- **An `aria-label` contains the visible label** (WCAG 2.5.3).

### Accessibility floor (WCAG 2.2 AA)

Text 4.5:1. Icons, borders and focus rings 3:1 (1.4.11). Targets 24px
minimum, 44px on touch (2.5.8). Focus never hidden behind sticky chrome
(2.4.11). Status is never colour alone (1.4.1). Reduced motion is respected
(2.3.3).

### State decides the screen

- **Every action is checked against the state and the viewer before it
  renders.** A cancelled, rejected or finished ride has no Share button. A
  driver is never offered "The driver did not arrive". Future tense never
  describes a past or stopped ride ("You'll receive" on a cancelled booking).
  Copy lists shown to both roles carry a `viewers` field and are filtered
  by it (`HELP_TOPICS` in `lib/trips/copy.ts`). This is a manual review item:
  no check can see the viewer.
  Source: "why would u share a cancelled ride the page is not intuitive".
- **A status is never shaped like a button.** A filled full-width bar that
  says "Nothing was charged" reads as an action. Status is an icon plus a
  sentence on a soft tone, with no hover state and no pill.
  `[check: status-as-button]` flags any static element with a bold fill
  (`green`, `ctaBg`, `accent`, a solid M3 role), a radius and a flex row.
- **Where the money is, is a `k-note`**: `tertiaryContainer` fill,
  `onTertiaryContainer` ink, a 20px `Lock`, one sentence. Never green:
  green is the colour of buttons, so a green money line reads as an action.
  Source: "how is nothing has been charged green it looks like the color of
  our buttons", 2026-11-23, and `docs/design/kipita-design-system.html` ›
  `.k-note`.
- **A stopped booking renders `trips/StoppedTrip`**: a hero on the error
  container wash with `RideStoppedArt` (the mascot, neutral face, U-turn
  sign), the status badge, who stopped it and when, the reason, the money
  note and one action. Below it: the ride (two towns, date, seats,
  reference), everyone on the ride (driver with car and plate, passenger,
  "You" on the viewer), the fare with what was charged and refunded, and
  only the steps that really happened.
- **A stopped or finished state leads with its illustration and one
  sentence**: who stopped it, when, and where the money is. The progress list,
  the money breakdown and help come after, smaller. Never a strikethrough
  amount. `[check: strikethrough]`

### Replies and composers

- **Replying never leaves the page, and the panel never floats on top.** On
  desktop it is a third column pinned to the right edge of the window
  (`AlertsColumns`), never in the middle of the page. It grows leftward out
  of that edge (clip-path). The feed and aside stay together as one block and
  slide left into the space that remains (Motion `layout="position"`,
  transforms only). It closes back into the same edge and they slide back.
  The aside, with search, trending roads and posting rules, never hides when
  the panel opens. If space is short, the feed column narrows. On phones it is a
  bottom sheet (`ui/Drawer` with `fill`, drag down to dismiss). The alert
  being answered sits at the top and the composer is pinned to the bottom.
  An overlay panel that lands on top of content is banned. It appears from
  nowhere and breaks trust.
  Source: "it pushes the other component left so that it appears to be the
  third component on the page, the width grows left smoothly".
- **Replies are flat rows, never cards.** Each row is the avatar, the name
  (with the verified mark), the text, then "3d · Reply" underneath. The heart
  and its count sit in their own column on the right. There are no borders
  between rows, no box around the list and no divider lines in the panel:
  spacing separates everything. A reply can be answered. Replies go one level
  deep (Postgres attaches a reply-to-a-reply to the top comment). They
  collapse under "View N replies", and the composer shows "Replying to Name"
  with a way to cancel.
  Source: TikTok comments, "why is text inside having a card and why are
  there borders ... why cant i reply within a reply".
- **Context and conversation differ by tone, not by boxes.** The alert at
  the top of the replies panel sits on a full-width `surface2` band, edge to
  edge with no border or radius. Replies sit below it on `surface`. Plain on
  plain is wrong, and so is a card.
  Source: "use tone to show the difference it should not be plain".
- **A verified driver's name always carries the verified mark**
  (`alerts/VerifiedMark`, from `users.is_verified`), wherever their name
  appears: card, thread, reply.
- **The side panel's rules are community conduct, not posting tips.** It is
  titled "Keep it respectful", with one line per rule.
  Source: "the rules of good alert is not how to post its keep it
  respectful".
- **Side panels carry one line per item.** A guide is a heading plus short
  one-line rules with an icon each. No descriptions under them, no
  footnotes, no paragraphs.
  Source: "add one line of rules nothing more it should be clean and
  understandable".
- **A composer is one rounded field with its tools inside it**: emoji and a
  photo, plus a round send button outside the field. Enter sends and
  Shift+Enter adds a new line. An attached photo shows as a 96px thumbnail
  above the field with a remove button. Replies accept a photo alone.
  Source: TikTok comment composer, 2026-11-22.
- **Emoji a person picks or types into their own text are content, not UI.**
  The picker set lives in `lib/alerts/emoji.ts`. Rule 2 still bans emoji in
  chrome, labels and copy that Kipita writes.

### Never make people wait to see what they did

- **Reversible, social and personal actions update at once and sync
  behind.** This covers posting, replying, photo uploads, likes, saves,
  votes, follows, edits, deletes, ratings, toggles and marking read. The item
  appears or disappears immediately, and a photo shows from the local
  preview. While it syncs it shows a small "Sending" or "Posting" marker. If
  it fails it stays where it is with "Not sent" or the error, plus Retry and
  Discard (or it comes back in place, for deletes). A composer clears the
  moment you send. A button never sits on "Posting…" while the list stays
  unchanged.
  Source: "user should never wait for actions to complete to see change".
- **Money, bookings, cancellations, verification and sign-in still wait**,
  because showing success early would lie. They must show a named
  in-progress state ("Check your phone", "Sending your request"), never only
  a disabled button.

### Every alert opens in the panel

- **No alert has its own page.** The place name, the views count, Reply,
  trending roads, shared links and notifications all open the replies panel
  over the feed. `/alerts/<id>` renders the feed with that alert's panel open
  (and keeps its own title and description for link previews). Opening and
  closing the panel change the address without navigating, and the browser's
  back button closes it.
  Source: "no more new page for alert its a side bar".
- **Every reply has a More menu**: Copy text, Select text, Share reply, and
  Delete reply on your own. Reply text is selectable everywhere.

### Tone comes from M3 colour roles

Map every surface to an M3 role
(https://m3.material.io/styles/color/roles). Never pick a tint by eye.

| Surface | M3 role | `theme.color` |
|---|---|---|
| page | Surface | `bg` |
| cards, aside panels | Surface container lowest | `surface` / `surfaceContainerLowest` |
| side sheet, replies dock | Surface container low | `surfaceContainerLow` |
| context band (the alert above its replies) | Surface container high | `surfaceContainerHigh` |
| filled text field, composer | Surface container highest | `surfaceContainerHighest` |
| chips and badges by meaning | primary, secondary, tertiary, error, warning, info, success container | `*Container` / `on*Container` |

### Illustration style

- **The house style is the art in `trips/ChatSheet.tsx` (a waving hand in an
  orange speech bubble next to a car) and `trips/CancelPanel.tsx` (a car
  beside a U-turn sign).** Flat cartoon objects, thick `cream` outline, soft
  token fills, the `cta` orange as the one hot spot. Every empty, stopped,
  success and confirm state gets one spot in this style, through the
  `kipita-illustration` skill.
  Source: two screenshots of that art, 2026-11-22.
- **The mascot is the smiling car from that art** (`trips/TripsArt.tsx`,
  `Mascot`). Each empty state pairs it with one object that says the meaning:
  a destination pin for no trips, a finish flag for no past trips, a waiting
  bubble for no requests. A mascot is allowed. A drawing that doesn't explain
  its state (a grey search pill, a faint road) is not.
  Source: "illustrations should make sense even if it means using a mascot u
  are allowed", 2026-11-22.

### Distinct, not average

- **Before building a surface, name its Kipita signature** and make it the
  biggest thing on the surface. A signature is something a generic template
  would not have: a road between two towns, a plate, a departure-board time,
  a real place name. Gray cards on beige with pills and a shadow are the
  internet average. They are rejected.
  Why *(inferred)*: specifics beat decoration (principle 4), and "average" was
  the complaint.

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

## Illustration

Three families exist, and they share one drawing language rather than one file:
`ui/MoneyArt.tsx` (payment drawer spots), `trips/WhyArt.tsx` (marketing bento),
`trips/StageArt.tsx` (the trip stage scenes). Anything new joins them; do not
start a fourth style.

**Style.** Geometric, flat 2D, no perspective and no gradient. Representational
enough to name the object — a seat is a seat, a car is a car — and no more.
Strokes are `2.6` for primary ink, `2` for secondary, round caps and joins,
`fill: none` by default. Depth comes from a single ground ellipse at 7–8%
opacity, never a shadow.

**Colour.** Token-only, through four classes each scene declares: `.ink`
(`cream`), `.accent` (`accent`), `.cta-fill` / `.on-cta` (the one highlight),
`.surface` (`surface-2`). Fills sit at 0.07–0.2 opacity under their own stroke.
Because every value is a CSS variable, one drawing serves light and dark — never
hardcode a hex into an SVG. A stopped state swaps `accent` for `muted-2` rather
than introducing red: the copy carries the bad news.

**Size and format.** Stage scenes are `320×180`, spots `180×128`, bento panels
`300×150`. Width is 100% to a `max-width`, height auto. Every illustration is
`aria-hidden` and `focusable="false"` where it has a stroke — the sentence next
to it carries the meaning, so a screen reader loses nothing.

**Motion.** Only three loops, all from `lib/nocturne.ts`: `dash` for a road,
`pulse` for a waiting beacon, `float` for something in transit. One loop per
scene. Every animation is switched off under `prefers-reduced-motion: reduce`,
including the stage confetti, which is removed entirely rather than slowed.

**Where they go.** A hero scene marks a state the user is waiting inside
(`/trips/[id]`); a spot marks a step inside a drawer; a bento panel argues a
claim. An illustration never carries information that is not also in text, and
never decorates a dense list — rows get a meter, not a drawing.

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

**2026-11-11 changes on top of the declaration.**

- **Time is tap-to-pick:** eight preset time words (past ones are hidden for today), plus a ruled `Another time` action that reveals a bare time input and one commit pill. The departure-board clock is no longer used here, because a stepper next to presets was two ways to set one value.
- **Publishing waits for an admin to approve the driver.** The gate under the money lines names the state: not submitted, under review (the action reads `Waiting for approval`) or rejected.
- **Rejected redesigns:** a stepped wizard, a 3-column rail with a preview, and one-question screens. Keep the sentence that builds up clause by clause.
- **Phones (under 900px) get `PublishMobile.tsx`,** built from the `Publish a Ride.dc.html` design. It has a green header with back, discard and an 8-segment progress bar, the build-up sentence with a lime pill on the open question, one step panel at a time, and a sticky bottom action. Time on phones is a tap grid plus `Another time`. `PublishSurface.tsx` picks the version by viewport and shows the skeleton until it knows.
- **Desktop car and ride details follow `Publish a Ride Web.dc.html`.** The car editor is a tile grid: an icon badge, name, plate and radio, plus a dashed `Add a car` tile that opens the make, model, colour and plate fields. Passenger preferences are check/cross chips under the car line, and they open a `What should passengers know?` editor of switch rows.
- **Large screens (900px and up) get `PublishWeb.tsx`,** built from the current `Publish a Ride Web.dc.html`:
  - **Layout:** a step rail, the sentence above one white card per step, and a passenger preview with the payout card on Review only.
  - **Time:** Morning / Afternoon / Evening tabs, half-hour slots, and a ±5 minute exact stepper with AM/PM.
  - **Price:** fare tiles, plus 'or set your own' with a KES prefix and a 'per seat' suffix.
  - **Car:** car tiles and an inline Add-a-car panel (one make-and-model field, auto-spaced Kenyan plate KDA 456B, colour swatches).
  `PublishDeclaration.tsx` (the old desktop sentence) is no longer rendered.
