# Movie Night design system

The look of the app, decided 2026-10-08. Every page follows this file; if a
design decision changes, change it here first (with the reason), then in code.

**Direction: cute and bubbly, always light.** A soft sky-blue world with white
cards, extra-round shapes and pastel chips. Blue is the main color because
both users like it. No dark mode for now (see the appendix for the dark
palette we designed, ready if that changes).

Where this came from: UI UX Pro Max (vendored in `.claude/skills/ui-ux-pro-max`)
suggested the **Claymorphism** style (soft, chunky, rounded, pastel) and the
**Playful Creative** font pairing; the palette was made blue-forward by hand
and every text color was checked for contrast (WCAG 2.1: 4.5:1 for text,
3:1 for focus rings and other UI parts).

---

## 1. Tokens: the only way pages get colors, fonts and shapes

Defined once in `app/globals.css` (Tailwind v4 `@theme`), used everywhere by
name. **Pages never use raw hex values or Tailwind's built-in palette**
(`zinc-*`, `blue-500`...). Changing the look = editing the tokens.

### Colors

| Token (`--color-*`) | Value | Use | Contrast |
|---|---|---|---|
| `page` | `#EEF5FF` | Page background (soft sky) | |
| `card` | `#FFFFFF` | Cards, panels, inputs | |
| `line` | `#C7DBFF` | Outlines, dividers, card borders | decorative |
| `ink` | `#1E293B` | Main text | 13.3:1 on page, 14.6:1 on card |
| `ink-muted` | `#5B6B85` | Secondary text, labels, metadata | 4.9:1 on page, 5.4:1 on card |
| `primary` | `#2563EB` | The ONE main action per screen; focus rings | white text 5.2:1; ring 4.7:1 on page |
| `primary-hover` | `#1D4ED8` | Main action on hover (darker, never lighter) | white text 6.7:1 |
| `on-primary` | `#FFFFFF` | Text/icons on `primary` | |
| `soft` | `#DBEAFE` | Selected pills (list toggles, chosen moods), poster placeholders | |
| `on-soft` | `#1E40AF` | Text on `soft`; links on white (`primary-hover` also fine) | 7.2:1 on soft |
| `mint` / `on-mint` | `#D1FAE5` / `#065F46` | Chip: a friend liked it; success ("Saved") | 6.8:1 |
| `lilac` / `on-lilac` | `#EDE9FE` / `#5B21B6` | Chip: "Because you liked..." | 7.6:1 |
| `peach` / `on-peach` | `#FFE4D6` / `#9A3412` | Chip: TMDB rating; "not for me" | 6.0:1 |
| `danger` | `#B91C1C` | Delete buttons (text + outline), error text | 5.9:1 on page, 6.5:1 on card; white on it 6.5:1 |
| `danger-soft` / `on-danger-soft` | `#FEE2E2` / `#991B1B` | Error banners | 6.8:1 |

(Tailwind's usual `red-600` `#DC2626` is *not* used: 4.4:1 on the sky page fails for text.)

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
request to Google from visitors' browsers). Sizes (Tailwind): page title
`text-3xl`, movie title `text-3xl` on /pick and the movie page, section heading
`text-xl`, body `text-base`, metadata `text-sm`. Line height 1.6 for body
text; titles tight (`tracking-tight`). Sentence case everywhere.

### Shape, depth, motion

| Token | Value | Use |
|---|---|---|
| `--radius-card` | `24px` | Cards, panels, the home picker card |
| `--radius-poster` | `18px` | Posters and their placeholders |
| `--radius-field` | `16px` | Text inputs, selects |
| pills | `9999px` (`rounded-full`) | Buttons, chips, toggles |
| outline | `2px solid line` (cards: `3px`) | Instead of hard dark borders |
| `--shadow-soft` | `0 6px 20px rgb(37 99 235 / 0.10)` | Cards that float (home picker, pick card). Sparingly. |

- Press feedback: `active:translate-y-px` plus a slightly darker fill; 150-200ms
  `ease-out` transitions on color, background and transform.
- Respect `prefers-reduced-motion`: no movement, only color changes.
- No glows, no gradients on text, no neumorphism (low contrast).

---

## 2. Components

**Page:** `bg-page text-ink font-body`, content `max-w-2xl`/`max-w-3xl` centered,
`px-4 py-10`. Mobile-first: everything must work at 375px with no sideways scroll.

**Card:** `bg-card`, 3px `line` outline, `radius-card`, padding 20-24px. The home
picker and the pick result also get `shadow-soft`.

**Buttons** (all pills, at least 40px tall, visible focus ring in `primary`):
- *Primary* (one per screen: "Recommend a movie", "Pick another", "Save", "Create"):
  `bg-primary text-on-primary` Fredoka, hover `primary-hover`.
- *Secondary*: `bg-card` with 2px `line` outline, `text-ink`, hover `bg-soft`.
- *Quiet* (Remove, Sign out): no fill, `text-ink-muted`, hover `text-ink` + `bg-soft`.
- *Destructive* (Delete list): `text-danger` with a `danger`-tinted outline; never
  the primary style. Always asks to confirm (see app/lists/forms.tsx).

**Toggle pills** (rating buttons, list pills, mood chips, who's watching):
unselected = secondary button; selected = `bg-soft text-on-soft` with a check
icon. Real checkboxes / `aria-pressed` buttons underneath, never divs.

**Reason chips** on /pick: small pills with an icon and text in a pastel pair:
friend liked = mint, because-you-liked = lilac, on your list = soft (blue),
rated N on TMDB = peach. "X wasn't into it" = peach.

**Inputs and selects:** `bg-card`, 2px `line` outline, `radius-field`, 44px tall,
focus = 2px `primary` ring. Labels above in `text-sm text-ink-muted font-semibold`.

**Posters:** `radius-poster`, placeholders `bg-soft`. Always `next/image`.

**Messages:** success = mint chip style; inline errors = `text-danger`,
banners = `bg-danger-soft text-on-danger-soft`, both `role="alert"`; empty
states are an invitation with one clear action.

**Icons:** lucide-react only, `aria-hidden` when decorative, 16-20px inline.
**No emojis anywhere in the UI.**

---

## 3. Implementation notes

- Tailwind v4: tokens live in `@theme { --color-page: #EEF5FF; ... }` in
  `app/globals.css`, which makes utilities like `bg-page`, `text-ink`,
  `border-line`, `rounded-card`, `font-heading`.
- Always light: set `color-scheme: light`, remove the `prefers-color-scheme: dark`
  block and every `dark:` class during the design pass.
- Known leftover to fix: `globals.css` sets `body { font-family: Arial }`, which
  overrides the fonts loaded in `layout.tsx`.
- Credit lines (TMDB footer, "Availability data provided by JustWatch") stay
  visible on every page that shows that data.

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
