// Parts of a printed ticket that several pages use (MASTER.md "Ticket").
// No hooks here, so both server and client components can use them.

import type { ReactNode } from "react";
import { sectionLabel } from "@/app/ui";

/** The tear line across a ticket: a dashed line with a round notch cut into
 *  each side. Put it straight inside the ticket, with no side padding around
 *  it, so the notches sit on the ticket's edges. The notches are circles in
 *  the page color, so the ticket must sit on `bg-page`. `small`: 16px notches
 *  instead of 26px, for small tickets (the /rate cards). `notches={false}`:
 *  just the dashed line, for a ticket that floats on the room art (login),
 *  where page-colored circles would show as light dots. */
export function Perforation({
  className = "",
  small = false,
  notches = true,
}: {
  className?: string;
  small?: boolean;
  notches?: boolean;
}) {
  // Each circle is centered on the 2px line and on the ticket's edge.
  const left = small ? "-top-2.25 -left-2 size-4" : "-top-3.5 -left-3.25 size-6.5";
  const right = small ? "-top-2.25 -right-2 size-4" : "-top-3.5 -right-3.25 size-6.5";
  return (
    <div aria-hidden="true" className={`relative h-0 border-t-2 border-dashed border-ink/45 ${className}`}>
      {notches && (
        <>
          <span className={`absolute ${left} rounded-full bg-page`} />
          <span className={`absolute ${right} rounded-full bg-page`} />
        </>
      )}
    </div>
  );
}

/** Two small notches in the middle of a small ticket's sides (the taste
 *  nudge). Put it inside an element with `relative`. */
export function SideNotches() {
  return (
    <>
      <span aria-hidden="true" className="absolute top-1/2 -left-2.25 size-4.5 -translate-y-1/2 rounded-full bg-page" />
      <span aria-hidden="true" className="absolute top-1/2 -right-2.25 size-4.5 -translate-y-1/2 rounded-full bg-page" />
    </>
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
