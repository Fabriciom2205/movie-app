---
name: frontend-design
description: How to build or change any page, component or style in this movie app (Next.js 16 + Tailwind v4) so it matches the Movie Night design system. Use for every UI task in this repo - new pages, restyling, layout fixes, adding buttons/forms/chips, colors, fonts, icons, spacing, mobile layout, accessibility - and for reviewing UI changes before a PR.
---

# Frontend design for Movie Night

The look is decided in `design-system/movie-night/MASTER.md`: cute and bubbly,
always light, sky-blue pastel world, blue as the main color, Fredoka + Nunito.
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

## Files in this skill

- `references/web-interface-guidelines.md`: review checklist, pinned (see its
  header for source, commit and license; update it only in its own PR).
- `scripts/contrast.mjs`: contrast ratio of two colors.
