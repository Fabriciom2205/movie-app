# Movie Night design system

The look of the app, decided 2026-10-08. Every page follows this file; if a
design decision changes, change it here first (with the reason), then in code.

**Direction: lavender cinema tickets, in front of a moonlit room.** Behind
every page is an original illustration of a purple bedroom at night (moon in
the window, sleeping cat, fairy lights, plushies; see "Background art"
below). Each page's content sits on a light lavender panel in front of it,
and the things on it are printed tickets: lavender ticket stock, square
corners, tall League Gothic capitals, typewriter-like DM Mono for the rest,
dashed perforations with round notches, a purple band and a rubber stamp.
The panels are always light: no dark mode for the UI itself (see the
appendix for the dark palette we designed, ready if that changes).

History:
- 2026-10-08: the first look (a sky-blue page with blue buttons) became
  lavender and cream (from a study-planner mockup the user liked), then got
  the night-room picture behind the site. That look was "cute and bubbly":
  UI UX Pro Max's **Claymorphism** (soft, chunky, rounded, pastel), Fredoka +
  Nunito, pills everywhere.
- 2026-10-10: the user found the round, soft look "too generic, like every AI
  app" (every control a pill, every group a soft-bordered card, a rounded
  font, a sparkles icon). Shown five directions as phone mockups (Scrapbook,
  Cozy game, Ticket booth, Video store, Film journal), they picked **Ticket
  booth**, in the lavender colors, with the logo as just the name, and the
  moonlit room kept behind it for now (they may drop it later). The mockups:
  https://claude.ai/artifact/2aEB3Y5jX4PNovxv9rWWpW ("3b").

Every text color is checked for contrast (WCAG 2.1: 4.5:1 for text, 3:1 for
text 24px and up, focus rings and other UI parts).

---

## 1. Tokens: the only way pages get colors, fonts and shapes

Defined once in `app/globals.css` (Tailwind v4 `@theme`), used everywhere by
name. **Pages never use raw hex values or Tailwind's built-in palette**
(`zinc-*`, `blue-500`...). Changing the look = editing the tokens.

### Colors

| Token (`--color-*`) | Value | Use | Contrast |
|---|---|---|---|
| `night` | `#241F42` | Behind the room art: the body, the browser bar on phones, below the art band on phones | |
| `on-night` | `#EDE6FA` | The only text outside a panel: the footer credits, on a `night/85` box | 12.8:1 on night |
| `page` | `#F5EDF5` | The panel each page's content sits on (lavender mist); also the round notches cut into tickets | |
| `ticket` | `#D2B9E8` | Ticket stock: cards, the main panel of each page's content | 1.55:1 against page (decorative edge, plus `shadow-soft`) |
| `ticket-pink` | `#F3C6D8` | A second ticket color, for small side tickets (the taste nudge) | |
| `card` | `#FFF8F6` | Inputs and selects ("white but not too white" cream) | |
| `line` | `#E5D5EA` | Faint dividers only; anything that should read as an edge is `ink` | decorative |
| `ink` | `#2E2433` | Main text (plum-black), outlines of buttons, fields and chips | 12.9:1 on page, 8.4:1 on ticket, 9.8:1 on ticket-pink, 14.1:1 on card |
| `ink-muted` | `#4F3D60` | Secondary text, labels, metadata | 8.4:1 on page, 5.5:1 on ticket, 6.4:1 on ticket-pink, 9.2:1 on card |
| `primary` | `#6A4896` | The ONE main action per screen; the band across the top of a ticket; focus rings | white text 7.1:1; ring 6.2:1 on page, 4.0:1 on ticket, 6.7:1 on card |
| `primary-hover` | `#5B3D8A` | Main action on hover (darker, never lighter) | white text 8.5:1 |
| `on-primary` | `#FFFFFF` | Text/icons on `primary` | |
| `stamp` | `#4A2F72` | The rubber stamp on a ticket ("Because you liked..."): text and double border | 6.1:1 on ticket, 9.4:1 on page |
| `soft` | `#EBDDF3` | Poster placeholders, info banners | |
| `on-soft` | `#573A80` | Text on `soft`; links | 7.0:1 on soft, 5.1:1 on ticket, 8.6:1 on card |
| `sage` / `on-sage` | `#E2EEDF` / `#35573A` | Chip: a friend liked it; success ("Saved") | 6.8:1 |
| `pink` / `on-pink` | `#FCE4EC` / `#8A2F55` | Chip: "Because you liked..." | 6.7:1 |
| `peach` / `on-peach` | `#FFE4D6` / `#9A3412` | Chip: TMDB rating; "not for me" | 6.0:1 |
| `danger` | `#991B1B` | Delete buttons (text + outline), error text | 7.3:1 on page, 4.7:1 on ticket, 7.9:1 on card; white on it 8.3:1 |
| `danger-soft` / `on-danger-soft` | `#FEE2E2` / `#991B1B` | Error banners | 6.8:1 |

Selected toggles are `ink` filled with `ticket`-colored text (8.4:1), like a
booked seat on a ticket.

Changed 2026-10-10 for the tickets: `primary` moved one step darker (it was
`#7A58A8`, which is now too close to the ticket stock), `ink-muted` darkened
from `#6A5C72` (4.4:1 on the ticket stock: fails) and `danger` from `#B91C1C`
(3.7:1 on the ticket stock: fails). `ticket`, `ticket-pink` and `stamp` are
new. (Tailwind's usual `red-600` `#DC2626` is *not* used: it fails for text
on the light page colors.)

Rules:
- Text on a colored fill always uses that fill's `on-*` partner, never `ink`.
  (The ticket colors are the exception: `ink` and `ink-muted` are made for them.)
- Never put `ink-muted` on a pastel chip fill.
- New colors need a contrast check (`node .claude/skills/frontend-design/scripts/contrast.mjs FG BG`) and a row in this table.

### Typography

| Token | Font | Use |
|---|---|---|
| `--font-heading` | **League Gothic** (one weight, 400) | Page and movie titles, ticket bands, button labels: tall, narrow capitals like cinema-ticket print |
| `--font-body` | **DM Mono** (400 / 500) | Everything else: the typewriter print of a ticket |

Loaded with `next/font/google` in `app/layout.tsx` (self-hosted at build time: no
request to Google from visitors' browsers). `globals.css` gives `h1`-`h3` League
Gothic in capitals (`uppercase`, weight 400, `line-height: 0.95`, a little
letter spacing, `text-wrap: balance`) and the body DM Mono at 15px, so headings
need no font class; anything else that should look like a heading (a button's
label) uses `font-heading uppercase`. The body has `font-synthesis: none`:
League Gothic has one weight and DM Mono stops at 500, so `font-semibold` /
`font-bold` show DM Mono's 500 instead of a smeared fake bold. Write text in
sentence case in the code; capitals come from CSS (`uppercase`), so screen
readers don't spell words out.

Sizes: League Gothic is narrow, so it runs big. Page title `text-5xl`, movie
title `text-6xl` on a ticket (`text-5xl` on phones if it's long), section
heading `text-3xl`, button labels `text-xl` to `text-3xl`. Labels above data
or controls are DM Mono `text-[11px]` capitals with wide tracking
(`sectionLabel`); body text 13-15px.

### Shape, depth, motion

| Token | Value | Use |
|---|---|---|
| corners | square | Everything: tickets, buttons, fields, chips, posters. Only things that are round in real life stay round (avatars, provider logos, the notches). |
| `--radius-*` | `0px` | Leftovers from the round look, kept at 0 so old `rounded-card` / `rounded-field` classes are square; each page's PR in the ticket pass deletes its uses, then these tokens go |
| outline | `2px solid ink` | Buttons, fields, chips, posters |
| `--shadow-soft` | `0 1px 0 rgb(46 36 51 / 0.15), 0 10px 24px rgb(46 36 51 / 0.12)` | Paper on paper: page panels, and the one ticket a page is about. Sparingly. |

- Press feedback: `active:translate-y-px` plus a darker fill; 150-200ms
  `ease-out` transitions on color, background and transform.
- Respect `prefers-reduced-motion`: no movement, only color changes.
- No glows, no gradients, no rounded "bubbly" shapes, no neumorphism.

---

## 2. Components

These are written once as class strings in `app/ui.ts` (`primaryButton`,
`secondaryButton`, `quietButton`, `dangerButton`, `field`,
`fieldPrimaryButton`, `fieldSecondaryButton`, `toggleChip`, `toggleButton`,
`toggleButtonBase`, `card`, `posterGrid`, `sectionLabel`, `tag`, `providerTag`,
`banner`). Pages import them instead of re-typing classes; changing a
component = changing it there. `app/movie-card-skeleton.tsx` is the shared
loading placeholder for a `posterGrid` card.

**Status of the ticket pass (2026-10-10):** step 1 changed the tokens, the
fonts and every class string in `app/ui.ts`, so all pages already have square
ticket-style buttons, fields, chips and cards. The page-by-page PRs (home,
/pick, movie page, lists, /rate, settings, login and the error pages) then
rebuild each page's own layout into tickets (bands, perforations, stamps) and
rewrite that page's section below. Until a page's PR lands, its section here
may still describe the round look.

**Page:** the room art fills the screen behind everything (`app/layout.tsx`);
each page's `<main>` is a `pagePanel` (opaque `bg-page`,
`shadow-soft`, `px-4 py-8`, `sm:px-8 sm:py-10`) plus its width (`max-w-2xl`,
`max-w-3xl`, `max-w-4xl`), centered. Text never sits directly on the art.
Pages whose content is one card (login, not found, the error pages) skip the
panel: the card floats on the art and is the panel. Phones: the content
starts 96px down (`pt-24`) so the moon shows above it, and the panel runs
edge to edge (text keeps its width, so "Recommend a movie" stays as high as
it can); from `sm` up, the panel floats 24px from the sides and 40px down.
Mobile-first: everything must work at 375px with no sideways scroll.

**Ticket (the `card` class):** `bg-ticket`, square, no outline, padding
20-24px. The one ticket a page is about (the home picker, the pick result)
also gets `shadow-soft`. A ticket can have:
- a **band**: a strip across the top in `bg-primary` with `text-on-primary`,
  League Gothic on the left ("Admit two"), small DM Mono capitals on the right
  ("Tonight · Fri 10 Oct");
- a **perforation**: a 2px dashed `ink`/45% line across the full width, with
  a 26px circle in `bg-page` centered on each side edge, so it looks like the
  ticket is notched where it tears. The part below is the stub, where the
  actions go;
- a **stamp**: League Gothic capitals in `text-stamp` inside a 4px double
  `stamp` border, rotated about -4deg ("Because you liked Project Hail Mary").
  Only one per ticket; it is text, not decoration (no `aria-hidden`);
- **fields**: a 2-column grid of label (`sectionLabel`) over value (League
  Gothic `text-2xl`), split by 1px `ink`/35% lines, like the seat and screen
  boxes on a printed ticket.
Small side tickets (the taste nudge) use `bg-ticket-pink` with 18px notches
in the middle of each side.

**Focus:** `globals.css` gives every focusable element a 2px `primary` outline
(offset 2px) on `:focus-visible`, so pages don't repeat it. The exception is
a control whose real input is visually hidden (toggle chips): its label uses
`has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary`.

**Header (home):** the logo is just the name, "Movie Night" in League
Gothic (`text-4xl`; no icon: the user dropped the moon mark on 2026-10-10),
then Lists / Settings / Sign out. Below `sm` they show only their icon (the
labels don't fit beside the title at 375px); the label stays as `sr-only`
text so screen readers still say it.

**Buttons** (all square, at least 44px tall, visible focus ring in `primary`):
- *Primary* (one per screen: "Recommend a movie", "Pick another", "Save", "Create"):
  `bg-primary text-on-primary`, League Gothic capitals `text-3xl`, 56px
  tall, hover `primary-hover`.
- *Secondary*: no fill, 2px `ink` outline, League Gothic capitals `text-xl`;
  on hover it fills with `ink` and the text turns `page`. Give it a fill
  (`bg-page`) if it ever floats over the art.
- *Ink block* (`fieldSecondaryButton`, "Find" beside a search field): solid
  `ink` with `ticket`-colored League Gothic, hover `primary`.
- *Quiet* (Remove, Sign out, Back): no fill, DM Mono capitals `text-xs`,
  `text-ink`, underlined on hover.
- *Destructive* (Delete list): `text-danger` with a 2px `danger` outline; never
  the primary style. Always asks to confirm (see app/lists/forms.tsx).

**Toggles** (rating buttons, list toggles, mood chips, who's watching):
square chips with a 2px `ink` outline and DM Mono capitals (13px);
selected = filled with `ink`, text in `ticket` (8.4:1), plus the check icon,
so the state isn't told by the fill color alone. Real checkboxes /
`aria-pressed` buttons underneath, never divs. For checkboxes, style from the
input itself (`has-checked:` on the label, `peer-checked:` on the icon) so
it works before JavaScript loads. The home page's genres can instead be
drawn as a ticket's tick boxes (a 16px `ink`-outlined square that fills
`primary` with a white X), as in the mockup.
Exception: the rating buttons ("Liked it" / "Not for me") mean something
beyond "chosen", so selected uses the meaning colors, as on /pick: liked =
`sage` with an `on-sage` outline, not for me = `peach` with an `on-peach`
outline, and the thumb icon fills in (a shape cue on top of color).

**Reason chips** on /pick: small pills with an icon and text in a pastel pair:
friend liked = sage, because-you-liked = pink, on your list = soft (lavender),
rated N on TMDB = peach. "X wasn't into it" = peach. They're `tag`s: no
outline (so they don't look pressable) and `radius-field`, which is a pill on
one line and a rounded box when a long reason wraps.

**Movie with its poster** (`posterGrid`, /pick and the movie page): the poster
sits beside the title, 120px wide on phones (so the title and what follows fit
on the first screen) and 200px from `sm` up; the details go under both on
phones and beside the poster wider up. Movie titles are `text-2xl` on phones,
`text-3xl` from `sm`. Put a real space (not a margin) between a title and its
"(year)", or the two can't wrap apart and stick out of a narrow column.

**Order on a result card** (/pick): what it is and why (title, reason tags,
overview), where to watch (provider tags), then the primary action ("Pick
another"); below a 2px `line` divider, the secondary actions (rate it, add to
a list). Streaming providers are `bg-page` tags with a round logo, so on the
cream card they read as data, not buttons.

**Movie page:** the `posterGrid` card (title + meta beside the poster; the
tagline goes under it, since a tagline is too long for the narrow column on
phones), your rating and lists under a divider, then a second card "Where to
watch in the US" with Stream / Free / Rent / Buy rows of `providerTag`s
(logo + name: on a phone you can't hover a bare logo to learn its name). The
back link says "Home" because you can arrive from search, /pick or a list.

**Lists:** `/lists` shows each list as a link card (soft circle with
`ListVideo`, name in Fredoka, "3 movies · with Alex", a `ChevronRight`). A
list's page: movie rows as cards with a quiet "Remove" inside; the outline turns
`primary` only when the movie link is hovered (`has-[a:hover]:border-primary`),
not when Remove is. "Seen by" is small tags, you first: "You liked it" in sage,
"Alex wasn't into it" in peach (the /pick colors), else "Not seen yet". Members
get their initial in a `soft` circle (decorative, `aria-hidden`). Settings
end with Delete (`dangerButton`, `Trash2`) or Leave (`secondaryButton`,
`LogOut`) plus one line saying what it does; both confirm first.

**Settings:** two cards, "About you" (name + country side by side from `sm`)
and "Your streaming services". Each field's visible label is a `<label
htmlFor>` and its help text is linked with `aria-describedby`. The country
`<select>` stays native (best on phones) with `appearance-none` and a
`ChevronDown` laid over it. Services are option cards: a visually hidden
checkbox inside a `radius-field` card (logo, name, then a round check that
fills `primary` with a white check when ticked; unticked it's a 2px
`ink-muted` ring, so the box is visible at 5.9:1). Ticked = `soft` fill +
`primary` outline, like toggle pills.

**Sticky save bar:** on a long form (settings), Save sits in a bar stuck to
the bottom of the screen (`sticky bottom-0`, `bg-page/95`, 2px `line` top
border; it reaches the panel's edges with `-mx-4 sm:-mx-8`) with
"Unsaved changes" / the sage "Saved." / the error beside it.
Anything focusable that could end up behind it gets `scroll-mb-28` on the
element that actually receives focus (the checkbox, not its card), so the
browser scrolls it clear of the bar.

**Rating grid** (/rate): each movie is a card (poster, title, then buttons
pinned to the bottom with `mt-auto`, so they line up across a row). Liked /
not for me are round icon buttons side by side, the one place the app uses
icon-only buttons: on a phone a card is ~145px wide, too narrow for two
labeled pills, and three stacked 40px pills would make each card very tall.
They carry the label as `aria-label` and `title`, the page's intro explains
the thumbs, and they take the meaning colors on hover and while pressed
(sage / peach with the `on-*` outline). "Haven't seen" stays a labeled quiet
button. The rated count is a pink `tag` with sparkles.

**Empty and error states:** a card with a `soft` circle holding an icon
(`Tv`, `SearchX`, `CloudOff`...), a heading that says what happened, a sentence
with the way forward, then one primary button and any alternatives as secondary.
`app/not-found.tsx` is this for missing movies, lists and URLs (Next's own 404
follows the device's dark mode).

**Loading:** the shape of what's coming in `soft` blocks (same grid, same
card), pulsing only with `motion-safe:animate-pulse`, plus a short `aria-live`
line ("Finding something for tonight…"). Trade-off: a page with `loading.tsx`
streams, so a `notFound()` there answers HTTP 200 (with a `noindex` tag)
instead of 404. Fine for this sign-in-only app; see Next's loading.md
"Status Codes".

**Inputs and selects:** `bg-card` (cream), 2px `ink` outline, square, 48px tall,
focus = 2px `primary` ring. Labels above as `sectionLabel` (DM Mono capitals).
Use a visible `<label htmlFor>` (an id from `useId()`), not only `aria-label`.
A button in the same row as a field is 48px too (`fieldPrimaryButton` /
`fieldSecondaryButton`), so they line up. Under a form: the error in
`text-danger`, or what worked ("Renamed.") as a sage `tag` with `CircleCheck`,
inside an always-present `aria-live` region.

**Posters:** `radius-poster` (small ones `radius-thumb`), placeholders `bg-soft`
with a `Film` icon in `on-soft`. Always `next/image`.

**Search results / movie rows:** each row is a link drawn as a small card:
`bg-card`, 2px `line` outline, `radius-card`, hover outline `primary`.

**Messages:** success = sage chip style; inline errors = `text-danger`,
banners = `bg-danger-soft text-on-danger-soft`, both `role="alert"`; empty
states are an invitation with one clear action. Banners use `radius-field`.
An info banner (e.g. "you haven't picked services, so...") is `bg-soft
text-on-soft` with the `Info` icon. The "Saved: you liked X." confirmation is
a sage `tag` with `CircleCheck`, inside an always-present `aria-live` region.
A taste nudge ("Rate a few movies you've seen") is a pink banner with the
`Sparkles` icon: pink + sparkles = your taste, as on /pick. On the home page
it sits under the main button, so that button stays on a phone's first screen.

**Icons:** lucide-react only, `aria-hidden` when decorative, 16-20px inline.
**No emojis anywhere in the UI.**

---

## 3. Implementation notes

- Tailwind v4: tokens live in `@theme { --color-page: #F5EDF5; ... }` in
  `app/globals.css`, which makes utilities like `bg-page`, `text-ink`,
  `border-line`, `rounded-card`, `font-heading`.
- Light panels: `color-scheme: light` in `globals.css` and in the `viewport`
  export of `app/layout.tsx`, so form controls stay light; `themeColor` =
  `night`, so phones tint their browser bar to match the room.
- The design pass (2026-10-08, PRs #16 to the login PR) converted every page.
  Since its last step, `app/` has no `dark:` classes, no Tailwind palette
  colors (`zinc-*`, `red-600`...), no raw hex in pages and no old
  `foreground` / `background` names; the temporary switch that turned old
  `dark:` classes off during the pass is gone. Don't add `dark:` classes: Tailwind's
  default `dark:` follows the device setting, so one would bring dark-mode
  colors back onto this always-light design. If dark mode is ever wanted, use
  the appendix below (dark values of the same tokens).
- Testing logged-out pages (login) without signing out: load the page in an
  `<iframe credentialless>` from the dev tools console; it gets no cookies,
  so it sees what a signed-out visitor sees.
- Credit lines (TMDB footer, "Availability data provided by JustWatch") stay
  visible on every page that shows that data.

---

## 4. Background art: the moonlit room

`design-system/movie-night/moonlit-room.svg` is the source (1920x1080,
hand-written SVG, ~21 KB); `app/moonlit-room.webp` is what the site shows
(exported from the SVG at 2560px wide, WebP quality 90, ~300 KB; `next/image`
serves smaller sizes per device).

- **Original art, inspired by** "Lofi Night" by redtreacle (Isabella Nalin),
  a paid stream package sold by StreamSpell under a personal-use license.
  That picture can't be used on this site (its license forbids copying it to
  another server, even with credit), so this one only shares the idea: a
  purple room at night, a big moon in the window, a sleeping cat, fairy
  lights. The footer says "Room illustration inspired by Lofi Night by
  redtreacle."
- **Laid out around the content panel:** the panel covers the middle, so the
  window, moon, cat and cubby teddy live in the left ~480px, and the lamp,
  bed, bunny and teddy in the right ~420px (shifted so they survive 16:10
  laptops, which crop the sides). The middle (popcorn poster, record, rug)
  is extra.
- **Hand-drawn look, not AI-looking:** flat shapes, dark outlines, a small
  palette, then an `feDisplacementMap` wobble on every edge and a faint
  `feTurbulence` paper grain. The moonlight on the floor is the window's four
  panes projected onto the floor (the gaps are the window bars' shadows),
  with the cat's and the plant's shadows cut out and the sheer curtains as
  soft partial shade.
- **On the page:** a fixed, `aria-hidden` `next/image` (`fill`,
  `object-cover`, `alt=""`) behind everything. Phones: a 224px strip across
  the top (the whole room, small: fairy lights, window and moon show above
  the panel), fading into `night`; from `sm`: the whole screen, centered from
  `lg`.
- **Changing it:** edit the SVG, then export it again to
  `app/moonlit-room.webp` at 2560px with any renderer that supports SVG
  filters (it was made with resvg). Keep the important things out of the
  middle.

---

## Appendix: the dark cinematic palette (not used yet)

Designed 2026-10-08 as the alternative. If dark mode comes back, these become the
dark values of the same tokens (under `prefers-color-scheme: dark`); pages don't
change. Fonts there: Inter.

| Token | Dark value | Contrast |
|---|---|---|
| `page` | `#070A12` (near-black, blue tint) | |
| `card` | `#0E1320` | |
| raised surface | `#151B2B` | |
| `line` | `#1E2A44` | decorative |
| `ink` | `#F1F5F9` | 18.1:1 on page |
| `ink-muted` | `#94A3B8` | 7.7:1 on page |
| `primary` / `primary-hover` | `#2563EB` / `#1D4ED8` (darker on hover) | white 5.2:1 / 6.7:1 |
| accent (links, icons, selected, focus) | `#60A5FA` | 7.8:1 on page |
| success / error text | `#34D399` / `#F87171` | 10.3:1 / 7.2:1 |
