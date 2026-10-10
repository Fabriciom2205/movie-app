---
name: frontend-design
description: How to build or change any page, component or style in this movie app (Next.js 16 + Tailwind v4) so it matches the Movie Night design system. Use for every UI task in this repo - new pages, restyling, layout fixes, adding buttons/forms/chips, colors, fonts, icons, spacing, mobile layout, accessibility - for restyling the app loosely after an existing website, and for reviewing UI changes before a PR.
---

# Frontend design for Movie Night

The look is decided in `design-system/movie-night/MASTER.md`: lavender
cinema tickets (square corners, perforations, a purple band, a rubber stamp)
on light panels in front of a moonlit-room illustration, League Gothic +
DM Mono. Never the round "bubbly" look it replaced (pills, soft cards).
**Read that file before changing UI.** It wins over any other suggestion,
including the UI UX Pro Max skill's.

## Rules (all of them, every time)

1. **Tokens only.** Colors, fonts, radii and shadows come from the tokens in
   `app/globals.css` (`bg-page`, `text-ink`, `border-line`, `rounded-card`,
   `font-heading`...). Never raw hex in a page, never Tailwind's built-in
   palette (`zinc-*`, `blue-500`, `red-600`...), never `dark:` classes (the app
   is always light). A new color is a new token: add it to MASTER.md with its
   contrast numbers, then to `globals.css`.
2. **No emojis anywhere in the UI.** Icons are `lucide-react`, `aria-hidden`
   when decorative, with a text label or `aria-label`.
3. **Contrast:** text 4.5:1, large text and UI parts (focus rings, outlines
   that matter) 3:1. Check any new pairing:
   `node .claude/skills/frontend-design/scripts/contrast.mjs "#FG" "#BG"`.
4. **Accessible by construction:** real `<button>`, `<a>`/`<Link>`, `<label>`,
   checkboxes and `aria-pressed`; visible focus (`focus-visible` ring in
   `primary`); `role="alert"` / `aria-live` for messages; destructive actions
   confirm first and must not work before JavaScript loads (see
   `ConfirmButton` in `app/lists/forms.tsx`).
5. **Mobile first:** must work at 375px wide with no sideways scroll; tap
   targets about 40px+.
6. **Next.js 16 is not the Next.js you know** (AGENTS.md): read the relevant
   guide in `node_modules/next/dist/docs/` before using a Next API. Fonts via
   `next/font/google` in `app/layout.tsx`; images via `next/image`.
7. **One main action per screen** in the primary style; everything else is
   secondary or quiet.
8. **Keep data credits visible:** the TMDB footer and "Availability data
   provided by JustWatch" wherever provider data shows.
9. **Text never sits on the room art.** A page's content goes in a
   `pagePanel` `<main>` (or, for a single-card page, in that card). The only
   exception is the footer credit, on its own `night` box.

## Workflow for a UI change

1. Read MASTER.md (and the page you're changing). Say what will change and why
   before editing, in plain words: the user is learning.
2. Need a pattern the design system doesn't cover (a new kind of component,
   a chart, an animation)? Ask the vendored UI UX Pro Max for ideas, then fit
   them to MASTER.md rather than copying them:
   `python .claude/skills/ui-ux-pro-max/scripts/search.py "<what you need>" --domain ux`
   (domains include `ux`, `style`, `color`, `typography`, `landing`, `chart`;
   `--stack nextjs` for Next-specific advice). Its SKILL.md shows the path as
   `${CLAUDE_PLUGIN_ROOT}/.claude/skills/...`; in this repo it's the path above.
   Don't use its `--persist` / `--force` (MASTER.md is hand-maintained).
3. Build it with tokens and the shared component classes in `app/ui.ts`
   (`primaryButton`, `card`, `toggleChip`, `tag`...; add one there rather than
   re-typing a component's classes in a page). Keep pages server components
   where possible; client components only for state and interaction.
4. Check it:
   - `npx eslint .`, `npm run typecheck`, `npm test`, `npm run build`
   - in the browser preview at desktop width **and** 375px; screenshot both
   - review the changed files against
     `references/web-interface-guidelines.md` (a pinned copy of Vercel's Web
     Interface Guidelines; report findings as `file:line`)
   - any write to the user's real data during testing gets undone
5. Small PRs: one page (or one shared component) at a time, with before/after
   screenshots described in the PR.
6. If a design decision changes, update MASTER.md in the same PR, with why.

## Designing from a reference site

When the user wants the look "loosely based on" an existing website. Neither
this skill nor UI UX Pro Max can study a site on its own; use the browser.

1. **Ask what they like about it.** "Based on" can mean the colors, the type,
   how dense or airy it is, the shapes, or one component (a card, a nav).
   Ask which pages, and what to keep from Movie Night.
2. **Study the real site in the browser** (the built-in browser pane, or
   Claude in Chrome if the user asks for it). Screenshot the pages they named
   at desktop width and 375px. Then read the actual values instead of guessing
   from screenshots: paste `scripts/read-styles.js` into the browser's
   JavaScript tool on each page. It only reads, and returns the most-used text
   colors, backgrounds, fonts, corner radii, shadows and samples of headings,
   links, buttons and inputs. Parts behind a login: the user signs in
   themselves in the browser; never type their credentials.
3. **Adapt, don't copy.** Take the feel (density, shapes, type style, contrast,
   mood). Never their logo, name, images, illustrations, copy or exact brand
   palette: Movie Night must not look like it belongs to them. A custom brand
   font can't be used; pick the closest Google Font (loaded with
   `next/font/google`; UI UX Pro Max's `--domain typography` search helps).
4. **Propose before building.** Show the user the new token values next to
   the current ones (a table, plus a quick mock or a screenshot of one page)
   and wait for a yes. A dark reference site means reversing "always light":
   use the dark palette in MASTER.md's appendix, and confirm that first.
5. **Record it in MASTER.md first**, in the same PR as the code: the new
   values with contrast numbers from `scripts/contrast.mjs`, and a short
   "Reference" note (which site, which parts, the date). Then change the
   tokens in `app/globals.css` and the components in `app/ui.ts`; since every
   page uses those, most of the app follows. Page layouts that need more go
   in small PRs, one page at a time, as usual.
6. **Check it like any UI change** (workflow step 4): every changed color pair,
   375px, before/after screenshots.

## Files in this skill

- `references/web-interface-guidelines.md`: review checklist, pinned (see its
  header for source, commit and license; update it only in its own PR).
- `scripts/contrast.mjs`: contrast ratio of two colors.
- `scripts/read-styles.js`: paste into the browser's JavaScript tool on a
  reference site to read its real colors, fonts, radii and shadows (read-only).
