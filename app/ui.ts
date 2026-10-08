// The Movie Night components as Tailwind class strings
// (design-system/movie-night/MASTER.md, section 2). Pages use these instead of
// re-typing a button's classes, so every page's buttons stay the same.
// Focus rings come from globals.css, so nothing here repeats them.

const pill =
  "inline-flex items-center justify-center gap-2 rounded-full transition-colors duration-150 ease-out motion-safe:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

/** The ONE main action per screen: blue, Fredoka, 48px tall. */
export const primaryButton = `${pill} h-12 px-7 bg-primary font-heading text-lg font-medium text-on-primary hover:bg-primary-hover disabled:hover:bg-primary`;

/** Everything else you can press: white with a soft blue outline. */
export const secondaryButton = `${pill} h-10 px-4 border-2 border-line bg-card text-sm font-semibold text-ink hover:bg-soft disabled:hover:bg-card`;

/** Low-key actions (Back, Sign out): no fill until hovered. */
export const quietButton = `${pill} h-10 px-3 text-sm font-semibold text-ink-muted hover:bg-soft hover:text-ink`;

const toggle =
  "inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-full border-2 border-line bg-card px-4 text-sm font-semibold text-ink transition-colors duration-150 ease-out hover:bg-soft motion-safe:active:translate-y-px";

/** A <label> around a visually hidden checkbox; styled from the checkbox, so it
 *  works before JavaScript loads. Put the check icon after the input with
 *  `peer-checked:block`. */
export const toggleChip = `${toggle} cursor-pointer select-none has-checked:border-primary has-checked:bg-soft has-checked:text-on-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary`;

/** A <button aria-pressed>: the same look, driven by aria-pressed. */
export const toggleButton = `${toggle} disabled:opacity-60 aria-pressed:border-primary aria-pressed:bg-soft aria-pressed:text-on-soft`;

/** White panel. Add `shadow-soft` for the one card a page is about. */
export const card = "rounded-card border-3 border-line bg-card p-5 sm:p-6";

/** A movie with its poster: poster beside the title (120px on phones, so the
 *  title and what comes right after fit on the first screen; 200px wider up),
 *  then the details. Children, in order:
 *  - the poster, with `sm:row-span-2`
 *  - the title block
 *  - the details, with `col-span-2 sm:col-span-1 sm:col-start-2`
 *  - optionally more, full width, with `col-span-2` */
export const posterGrid =
  "grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-x-6";

/** Small label above a group of controls or a bit of data. */
export const sectionLabel = "text-sm font-semibold text-ink-muted";

/** Not pressable: an icon + short text in a pastel pair (add e.g. `bg-mint text-on-mint`).
 *  radius-field: a pill on one line, a rounded box if it wraps. */
export const tag = "inline-flex items-start gap-1.5 rounded-field px-3 py-1 text-sm font-semibold";

/** A message box (add a color pair, e.g. `bg-soft text-on-soft`). */
export const banner = "flex items-start gap-2.5 rounded-field px-4 py-3 text-sm";
