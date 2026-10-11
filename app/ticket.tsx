// Parts of a printed ticket that several pages use (MASTER.md "Ticket").
// No hooks here, so both server and client components can use them.

/** The tear line across a ticket: a dashed line with a round notch cut into
 *  each side. Put it straight inside the ticket, with no side padding around
 *  it, so the notches sit on the ticket's edges. The notches are circles in
 *  the page color, so the ticket must sit on `bg-page`. */
export function Perforation({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative h-0 border-t-2 border-dashed border-ink/45 ${className}`}>
      <span className="absolute -top-3.5 -left-3.25 size-6.5 rounded-full bg-page" />
      <span className="absolute -top-3.5 -right-3.25 size-6.5 rounded-full bg-page" />
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
