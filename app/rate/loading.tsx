import { TearLine, WallCard, WallTicket } from "@/app/ticket";
import { wallColumn } from "@/app/ui";

// Shown right away while the well-known movies load from TMDB: the page's
// shape on the wall, soft lavender blocks on the tickets, laid out like
// page.tsx and rate-grid.tsx. Pulses only if the device allows motion.
export default function RateLoading() {
  const block = "bg-soft motion-safe:animate-pulse";
  return (
    <main id="content" className={`${wallColumn} max-w-4xl`}>
      <p aria-live="polite" className="sr-only">
        Loading movies to rate…
      </p>
      <div aria-hidden="true">
        {/* Where the Done link goes, and across from it the pink count. */}
        <div className="flex justify-end">
          <WallTicket tilt="rotate-[0.8deg]" className="shrink-0">
            <div className="side-notches-cut bg-ticket-pink px-7.5 py-2.5">
              <div className={`h-7.5 w-32 ${block}`} />
            </div>
          </WallTicket>
        </div>
        <WallCard tape className="mt-7 max-w-2xl">
          <div className={`h-10 w-3/4 max-w-md sm:h-12 ${block}`} /> {/* the h1: one line, 40px (48px wider up) */}
          {/* The how-to text: one block per line, in the same font size and
              line height, so the grid doesn't jump when it arrives. It wraps
              to 6 lines on a phone and 3 wider up. */}
          <div className="mt-3 text-sm leading-relaxed">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={`flex h-lh items-center ${i >= 3 ? "sm:hidden" : ""}`}>
                {/* The last line is shorter: line 3 wider up, line 6 on a phone. */}
                <div className={`h-3.5 ${i === 2 ? "w-full sm:w-2/3" : i === 5 ? "w-2/3" : "w-full"} ${block}`} />
              </div>
            ))}
          </div>
        </WallCard>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="on-the-wall">
              <div className="ticket-cut-top ticket-cut-small bg-ticket pt-3 pb-4">
                <div className="px-2.5">
                  <div className={`aspect-2/3 ${block}`} />
                  <div className={`mt-3 h-5 w-4/5 ${block}`} />
                </div>
              </div>
              <div className="ticket-cut-stub ticket-cut-small relative -mt-px bg-ticket py-3">
                <TearLine small />
                <div className="grid grid-cols-2 gap-2 px-2.5 pt-1.5">
                  <div className={`h-11 ${block}`} />
                  <div className={`h-11 ${block}`} />
                  <div className={`col-span-2 h-11 ${block}`} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
