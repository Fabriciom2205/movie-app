# Movie Night design system

The look of the app, decided 2026-10-08. Every page follows this file; if a
design decision changes, change it here first (with the reason), then in code.

**Direction: a cozy moonlit room, with cute and bubbly light panels.** Behind
every page is an original illustration of a purple bedroom at night (moon in
the window, sleeping cat, fairy lights, plushies; see "Background art"
below). Each page's content sits on a light lavender panel in front of it,
with cream cards, extra-round shapes and pastel chips. Lavender is the main
color. The panels are always light: no dark mode for the UI itself (see the
appendix for the dark palette we designed, ready if that changes).

Changed 2026-10-08 from the first look (a sky-blue page with blue buttons):
the user picked lavender and a "white but not too white" cream from a
study-planner mockup they liked, then asked for a lofi night-room picture
behind the site.

Where this came from: UI UX Pro Max (vendored in `.claude/skills/ui-ux-pro-max`)
suggested the **Claymorphism** style (soft, chunky, rounded, pastel) and the
**Playful Creative** font pairing; the first palette was made blue-forward by
hand (now lavender, see below) and every text color was checked for contrast
(WCAG 2.1: 4.5:1 for text, 3:1 for focus rings and other UI parts).

---

## 1. Tokens: the only way pages get colors, fonts and shapes

Defined once in `app/globals.css` (Tailwind v4 `@theme`), used everywhere by
name. **Pages never use raw hex values or Tailwind's built-in palette**
(`zinc-*`, `blue-500`...). Changing the look = editing the tokens.

### Colors

| Token (`--color-*`) | Value | Use | Contrast |
|---|---|---|---|
| `night` | `#241F42` | Behind the room art: the body, the browser bar on phones, below the art band on phones | |
| `on-night` | `#EDE6FA` | The only text outside a panel: the footer credits, on a `night/85` pill | 12.8:1 on night |
| `page` | `#F5EDF5` | The panel each page's content sits on (lavender mist) | |
| `card` | `#FFF8F6` | Cards, inputs ("white but not too white" cream) | |
| `line` | `#E5D5EA` | Outlines, dividers, card borders | decorative |
| `ink` | `#2E2433` | Main text (plum-black) | 12.9:1 on page, 14.1:1 on card |
| `ink-muted` | `#6A5C72` | Secondary text, labels, metadata | 5.4:1 on page, 5.9:1 on card |
| `primary` | `#7A58A8` | The ONE main action per screen; focus rings | white text 5.5:1; ring 4.8:1 on page, 5.3:1 on card |
| `primary-hover` | `#6A4896` | Main action on hover (darker, never lighter) | white text 7.1:1 |
| `on-primary` | `#FFFFFF` | Text/icons on `primary` | |
| `soft` | `#EBDDF3` | Selected pills (list toggles, chosen moods), poster placeholders | |
| `on-soft` | `#573A80` | Text on `soft`; links on cream | 7.0:1 on soft, 8.6:1 on card |
| `sage` / `on-sage` | `#E2EEDF` / `#35573A` | Chip: a friend liked it; success ("Saved") | 6.8:1 |
| `pink` / `on-pink` | `#FCE4EC` / `#8A2F55` | Chip: "Because you liked..."; the taste nudge | 6.7:1 |
| `peach` / `on-peach` | `#FFE4D6` / `#9A3412` | Chip: TMDB rating; "not for me" | 6.0:1 |
| `danger` | `#B91C1C` | Delete buttons (text + outline), error text | 5.6:1 on page, 6.2:1 on card; white on it 6.5:1 |
| `danger-soft` / `on-danger-soft` | `#FEE2E2` / `#991B1B` | Error banners | 6.8:1 |

The mockup's own purple (`#BDA0CD`) is too pale for white text (2.3:1), so
buttons use the deeper `primary`; the pale purples live on in the art.
(Tailwind's usual `red-600` `#DC2626` is *not* used: it fails for text on the
light page colors.)

Rules:
- Text on a colored fill always uses that fill's `on-*` partner, never `ink`.
- Never put `ink-muted` on a colored fill.
- New colors need a contrast check (`node .claude/skills/frontend-design/scripts/contrast.mjs FG BG`) and a row in this table.

### Typography

| Token | Font | Use |
|---|---|---|
| `--font-heading` | **Fredoka** (variable, weights 500-600) | Page titles, movie titles, button labels of main actions |
| `--font-body` | **Nunito** (variable, 400 / 600 / 700) | Everything else |

Loaded with `next/font/google` in `app/layout.tsx` (self-hosted at build time: no
request to Google from visitors' browsers). `globals.css` gives `h1`-`h3` Fredoka
and the body Nunito, so headings need no font class; anything else that should
look like a heading (a main button's label) uses `font-heading`. Headings also get
`text-wrap: balance` there (no lone word on a heading's last line). Sizes (Tailwind): page title
`text-3xl`, movie title `text-3xl` on /pick and the movie page, section heading
`text-xl`, body `text-base`, metadata `text-sm`. Line height 1.6 for body
text; titles tight (`tracking-tight`). Sentence case everywhere.

### Shape, depth, motion

| Token | Value | Use |
|---|---|---|
| `--radius-card` | `24px` | Cards, panels, the home picker card |
| `--radius-poster` | `18px` | Posters and their placeholders |
| `--radius-field` | `16px` | Text inputs, selects, message banners |
| `--radius-thumb` | `12px` | Small posters (search results, list rows), where 18px would round off a third of a 62px-wide poster |
| pills | `9999px` (`rounded-full`) | Buttons, chips, toggles |
| outline | `2px solid line` (cards: `3px`) | Instead of hard dark borders |
| `--shadow-soft` | `0 6px 20px rgb(122 88 168 / 0.14)` | Page panels, and cards that float (home picker, pick card). Sparingly. |

- Press feedback: `active:translate-y-px` plus a slightly darker fill; 150-200ms
  `ease-out` transitions on color, background and transform.
- Respect `prefers-reduced-motion`: no movement, only color changes.
- No glows, no gradients on text, no neumorphism (low contrast).

---

## 2. Components

These are written once as class strings in `app/ui.ts` (`primaryButton`,
`secondaryButton`, `quietButton`, `dangerButton`, `field`,
`fieldPrimaryButton`, `fieldSecondaryButton`, `toggleChip`, `toggleButton`,
`toggleButtonBase`, `card`, `posterGrid`, `sectionLabel`, `tag`, `providerTag`,
`banner`). Pages import them instead of re-typing classes; changing a
component = changing it there. `app/movie-card-skeleton.tsx` is the shared
loading placeholder for a `posterGrid` card.

**Page:** the room art fills the screen behind everything (`app/layout.tsx`);
each page's `<main>` is a `pagePanel` (opaque `bg-page`, `radius-card`,
`shadow-soft`, `px-4 py-8`, `sm:px-8 sm:py-10`) plus its width (`max-w-2xl`,
`max-w-3xl`, `max-w-4xl`), centered. Text never sits directly on the art.
Pages whose content is one card (login, not found, the error pages) skip the
panel: the card floats on the art and is the panel. Phones: the content
starts 144px down (`pt-36`) so the moon shows above it; from `sm` up, 40px.
Mobile-first: everything must work at 375px with no sideways scroll.

**Card:** `bg-card` (cream), 3px `line` outline, `radius-card`, padding 20-24px.
The home picker and the pick result also get `shadow-soft`.

**Focus:** `globals.css` gives every focusable element a 2px `primary` outline
(offset 2px) on `:focus-visible`, so pages don't repeat it. The exception is
a control whose real input is visually hidden (toggle pills): its label uses
`has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary`.

**Header (home):** the moon logo (lucide `MoonStar`) in a `primary` circle + "Movie Night", then
quiet pills for Lists / Settings / Sign out. Below `sm` they show only their
icon (the labels don't fit beside the title at 375px); the label stays as
`sr-only` text so screen readers still say it.

**Buttons** (all pills, at least 40px tall, visible focus ring in `primary`):
- *Primary* (one per screen: "Recommend a movie", "Pick another", "Save", "Create"):
  `bg-primary text-on-primary` Fredoka, hover `primary-hover`.
- *Secondary*: `bg-card` with 2px `line` outline, `text-ink`, hover `bg-soft`.
- *Quiet* (Remove, Sign out): no fill, `text-ink-muted`, hover `text-ink` + `bg-soft`.
- *Destructive* (Delete list): `text-danger` with a `danger`-tinted outline; never
  the primary style. Always asks to confirm (see app/lists/forms.tsx).

**Toggle pills** (rating buttons, list pills, mood chips, who's watching):
unselected = secondary button; selected = `bg-soft text-on-soft` with a check
icon and a 2px `primary` outline (4.2:1 against the soft fill, 5.2:1 against
the card), so the state isn't told by the fill color alone. Real checkboxes /
`aria-pressed` buttons underneath, never divs. For checkboxes, style from the
input itself (`has-checked:` on the label, `peer-checked:` on the icon) so
it works before JavaScript loads.
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

**Inputs and selects:** `bg-card`, 2px `line` outline, `radius-field`, 44px tall,
focus = 2px `primary` ring. Labels above in `text-sm text-ink-muted font-semibold`.
Use a visible `<label htmlFor>` (an id from `useId()`), not only `aria-label`.
A button in the same row as a field is 44px too (`fieldPrimaryButton` /
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
  `object-cover`, `alt=""`) behind everything. Phones: a band across the top
  (45% of the screen height, positioned on the window), fading into `night`;
  from `sm`: the whole screen, centered from `lg`.
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
