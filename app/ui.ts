// The Movie Night components as Tailwind class strings
// (design-system/movie-night/MASTER.md, section 2). Pages use these instead of
// re-typing a button's classes, so every page's buttons stay the same.
// Focus rings come from globals.css, so nothing here repeats them.
// Everything is square: the look is printed cinema tickets.

const button =
  "inline-flex items-center justify-center gap-2 transition-colors duration-150 ease-out motion-safe:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

// How each kind of button looks; the exports below add a size. Button labels
// are League Gothic capitals (font-heading), like the print on a ticket.
const primaryLook =
  "bg-primary font-heading uppercase tracking-wide text-on-primary hover:bg-primary-hover disabled:hover:bg-primary";
const secondaryLook =
  "border-2 border-ink font-heading uppercase tracking-wide text-ink hover:bg-ink hover:text-page disabled:hover:bg-transparent disabled:hover:text-ink";
const inkLook =
  "bg-ink font-heading uppercase tracking-wide text-ticket hover:bg-primary hover:text-on-primary disabled:hover:bg-ink disabled:hover:text-ticket";

/** The ONE main action per screen: a purple bar, 56px tall. */
export const primaryButton = `${button} h-14 px-7 text-3xl leading-none ${primaryLook}`;

/** Everything else you can press: an ink outline that fills in on hover. */
export const secondaryButton = `${button} h-11 px-4 text-xl leading-none ${secondaryLook}`;

/** Low-key actions (Back, Sign out, Remove): small typewriter capitals,
 *  underlined on hover. */
export const quietButton = `${button} h-11 px-2 font-body text-xs font-medium uppercase tracking-wider text-ink underline-offset-4 hover:underline`;

/** Add to anything focusable whose focus ring lands on the room art (a
 *  ticket that is itself a link, a field or button on the art): the purple
 *  ring is only 1.7:1 against the wall, a night-colored one 9.9:1. */
export const focusRingOnArt = "focus-visible:outline-on-night";

/** The same, straight on the room art (a page's back link above its
 *  ticket): night-colored text with a dark shadow. */
export const quietButtonOnArt = `${button} h-11 px-2 font-body text-xs font-medium uppercase tracking-wider text-on-night text-shadow-md text-shadow-night underline-offset-4 hover:underline ${focusRingOnArt}`;

/** Deleting something for good: a red outline and red text, never the
 *  primary style, and always behind a confirmation (ConfirmButton). */
export const dangerButton = `${button} h-11 px-4 border-2 border-danger font-heading text-xl uppercase leading-none tracking-wide text-danger hover:bg-danger-soft`;

/** A text input: 48px, cream, ink outline. Give it a <label> (or aria-label). */
export const field =
  "h-12 w-full min-w-0 border-2 border-ink bg-card px-3.5 font-body placeholder:text-ink-muted";

/** Buttons in a row with a `field`: the field's 48px height. The secondary
 *  one is a solid ink block ("Find"), so it reads as part of the field. */
export const fieldPrimaryButton = `${button} h-12 shrink-0 px-5 text-2xl leading-none ${primaryLook}`;
export const fieldSecondaryButton = `${button} h-12 shrink-0 px-5 text-2xl leading-none ${inkLook}`;

/** The same, for a field that sits straight on the room art (the home
 *  page's search): a lavender block, since an ink one would vanish into the
 *  dark wall. */
export const fieldTicketButton = `${button} h-12 shrink-0 px-5 text-2xl leading-none bg-ticket font-heading uppercase tracking-wide text-ink hover:bg-card`;

const toggle =
  "inline-flex min-h-11 max-w-full items-center gap-2 border-2 border-ink px-3 font-body text-[13px] font-medium uppercase tracking-wide text-ink transition-colors duration-150 ease-out hover:bg-ink/10 motion-safe:active:translate-y-px";

/** A <label> around a visually hidden checkbox; styled from the checkbox, so it
 *  works before JavaScript loads. Selected = filled with ink, like a booked
 *  seat. Put the check icon after the input with `peer-checked:block`. */
export const toggleChip = `${toggle} cursor-pointer select-none has-checked:bg-ink has-checked:text-ticket has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary`;

/** A <button aria-pressed>: the same look, driven by aria-pressed. */
export const toggleButton = `${toggle} disabled:opacity-60 aria-pressed:bg-ink aria-pressed:text-ticket`;

/** A <button aria-pressed> whose selected look you add yourself, for toggles
 *  that mean something other than "chosen" (rating: liked = sage, not for me
 *  = peach). Add `aria-pressed:` classes for fill, text and outline. */
export const toggleButtonBase = `${toggle} disabled:opacity-60`;

/** A ticket: lavender stock, square corners. Add `shadow-soft` for the one
 *  ticket a page is about. */
export const card = "bg-ticket p-5 sm:p-6";

/** The panel a page's content sits on, in front of the room art. Add the
 *  page's width: `${pagePanel} max-w-2xl`. Opaque, so text never sits on the
 *  art. Pages whose content is a single card (login, not found, errors) skip
 *  it: there the card is the panel. */
export const pagePanel = "mx-auto w-full bg-page px-4 py-8 shadow-soft sm:px-8 sm:py-10";

/** A page with no panel: its tickets sit straight on the room's wall
 *  (MASTER.md "Paper on the wall"). Add the page's width, e.g.
 *  `${wallColumn} max-w-176`. 16px sides on phones; wider up, the layout's
 *  own 24px. */
export const wallColumn = "mx-auto w-full px-4 pb-8 sm:px-0";

/** Ticket paper on the wall: lavender stock with a faint grain. Add a cut
 *  from globals.css (`ticket-cut`, or `ticket-cut-top` + `ticket-cut-stub`)
 *  with top and bottom padding only, and pad an inner element sideways. */
export const paper = "bg-ticket paper-grain";

/** Small print straight on the art (the JustWatch credit under a ticket). */
export const smallPrintOnArt = "text-xs text-on-night/75 text-shadow-md text-shadow-night";

/** Short text straight on the art: a wall page's title, the line under it,
 *  a one-line message. Add the size. Anything longer goes on paper. */
export const textOnArt = "text-on-night text-shadow-md text-shadow-night";

/** A movie with its poster: poster beside the title (120px on phones, so the
 *  title and what comes right after fit on the first screen; 200px wider up),
 *  then the details. Children, in order:
 *  - the poster, with `sm:row-span-2`
 *  - the title block
 *  - the details, with `col-span-2 sm:col-span-1 sm:col-start-2`
 *  - optionally more, full width, with `col-span-2` */
export const posterGrid =
  "grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-x-6";

/** Small label above a group of controls or a bit of data: typewriter
 *  capitals, like the field names on a ticket. font-body so it looks the
 *  same on an <h3> (headings get League Gothic by default). */
export const sectionLabel = "font-body text-[11px] font-medium uppercase tracking-widest text-ink-muted";

/** The same label straight on the room art (the home page has no panel):
 *  night-colored text with a dark shadow, so it reads over the wall. */
export const sectionLabelOnArt =
  "font-body text-xs font-medium uppercase tracking-widest text-on-night text-shadow-md text-shadow-night";

/** A provider (Netflix, Prime Video...) as data, not a button: logo + name in
 *  an ink outline. Put a 28px round logo (`size-7 rounded-full`) first. */
export const providerTag = "inline-flex items-center gap-2 border-2 border-ink bg-card py-1 pr-3.5 pl-1 text-sm font-medium";

/** Not pressable: an icon + short text in a pastel pair (add e.g. `bg-sage text-on-sage`). */
export const tag = "inline-flex items-start gap-1.5 px-2.5 py-1 text-xs font-medium uppercase tracking-wide";

/** A message box (add a color pair, e.g. `bg-soft text-on-soft`). */
export const banner = "flex items-start gap-2.5 px-4 py-3 text-sm";
