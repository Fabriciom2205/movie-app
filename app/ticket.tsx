// Parts of a printed ticket that several pages use (MASTER.md "Ticket").
// No hooks here, so both server and client components can use them.

import type { ReactNode } from "react";
import { paper, sectionLabel } from "@/app/ui";

/** A ticket on the room's wall (pages with no panel): tilted a little,
 *  optionally taped up (the one main ticket of a page), with the room art's
 *  outline traced around its paper. Put the paper inside: a `WallCard`'s, or
 *  pieces cut with `ticket-cut-top` + `ticket-cut-stub` (globals.css). Pass
 *  `tilt` as a literal class ("-rotate-1", "rotate-[0.6deg]") so Tailwind
 *  sees it. A ticket with a band across its top passes `tapeTop` (a literal
 *  class too) to lift the tape on phones, where the band's print fills the
 *  width and the tape would cover it. */
export function WallTicket({
  tape = false,
  tapeTop = "-top-3.5",
  tilt = "-rotate-1",
  className = "",
  children,
}: {
  tape?: boolean;
  tapeTop?: string;
  tilt?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative ${tilt} ${className}`}>
      {tape && (
        <span
          aria-hidden="true"
          className={`washi-tape absolute ${tapeTop} left-1/2 z-10 h-7.5 w-32 -translate-x-1/2 -rotate-4`}
        />
      )}
      <div className="on-the-wall">{children}</div>
    </div>
  );
}

/** A one-piece ticket on the wall (no stub): cut corners and side bites,
 *  20-24px of padding inside. For cards: empty states, errors, "Where to
 *  watch". `as` picks the element ("section" with `aria-labelledby`, say). */
export function WallCard({
  as: Tag = "div",
  tape,
  tilt,
  className,
  children,
  ...props
}: {
  as?: "div" | "section" | "article";
  tape?: boolean;
  tilt?: string;
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
}) {
  return (
    <WallTicket tape={tape} tilt={tilt} className={className}>
      <Tag className={`ticket-cut ${paper} py-4 sm:py-5`} {...props}>
        <div className="px-5 py-1 sm:px-6">{children}</div>
      </Tag>
    </WallTicket>
  );
}

/** The tear line at the top of a stub on the wall: a row of printed
 *  perforation holes. Put it first inside the `relative` stub piece; the
 *  notches come from the pieces' cuts. `small`: for a small ticket
 *  (`ticket-cut-small`), whose notches are smaller, so the holes start
 *  closer to the edges. */
export function TearLine({ small = false }: { small?: boolean }) {
  const inset = small ? "inset-x-3" : "inset-x-5.5";
  return <span aria-hidden="true" className={`perforation-dots absolute top-0.5 h-1.5 ${inset}`} />;
}

/** The tear line across a ticket: a dashed line with a round notch cut into
 *  each side. Put it straight inside the ticket, with no side padding around
 *  it, so the notches sit on the ticket's edges. The notches are circles in
 *  the page color, so the ticket must sit on `bg-page`. `notches={false}`:
 *  just the dashed line, for a ticket that floats on the room art (login),
 *  where page-colored circles would show as light dots. */
export function Perforation({ className = "", notches = true }: { className?: string; notches?: boolean }) {
  // Each circle is centered on the 2px line and on the ticket's edge.
  return (
    <div aria-hidden="true" className={`relative h-0 border-t-2 border-dashed border-ink/45 ${className}`}>
      {notches && (
        <>
          <span className="absolute -top-3.5 -left-3.25 size-6.5 rounded-full bg-page" />
          <span className="absolute -top-3.5 -right-3.25 size-6.5 rounded-full bg-page" />
        </>
      )}
    </div>
  );
}

export type TicketField = { label: string; value: ReactNode; wide?: boolean };

// The boxes printed on a ticket (MASTER.md "Ticket", fields): a label over a
// value, two to a row, split by thin lines. Fields without a value are left
// out; a short one left alone on its row takes the whole row.
export function TicketFields({ fields }: { fields: TicketField[] }) {
  return (
    <dl className="grid grid-cols-2 border-t-2 border-ink">
      {placeFields(fields).map((f) => (
        <div
          key={f.label}
          className={`border-b border-ink/35 py-2 ${f.wide ? "col-span-2" : f.left ? "pr-3" : "border-l border-l-ink/35 pl-3"}`}
        >
          <dt className={sectionLabel}>{f.label}</dt>
          <dd className="mt-1 font-heading text-2xl leading-none tracking-wide uppercase">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Drops the empty fields and works out each one's spot: full width (`wide`),
// or the left or right half of a row (`left`), so TicketFields knows where
// the dividing line between two halves goes.
function placeFields(fields: TicketField[]): (TicketField & { wide: boolean; left: boolean })[] {
  const shown = fields.filter((f) => f.value);
  const placed = [];
  let column = 0;
  for (let i = 0; i < shown.length; i++) {
    const next = shown[i + 1];
    const wide = Boolean(shown[i].wide) || (column === 0 && (!next || Boolean(next.wide)));
    placed.push({ ...shown[i], wide, left: column === 0 });
    column = wide ? 0 : 1 - column;
  }
  return placed;
}
