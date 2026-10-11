import { Perforation } from "@/app/ticket";
import { pagePanel } from "@/app/ui";

// Shown right away while the well-known movies load from TMDB: the grid's
// shape, small tickets with soft lavender blocks, laid out like
// rate-grid.tsx. Pulses only if the device allows motion.
export default function RateLoading() {
  const block = "bg-soft motion-safe:animate-pulse";
  return (
    <main id="content" className={`${pagePanel} max-w-4xl`}>
      <div className="h-11" /> {/* where the Done link goes */}
      <p aria-live="polite" className="sr-only">
        Loading movies to rate…
      </p>
      <div aria-hidden="true">
        <div className={`mt-4 h-11 w-3/4 max-w-md ${block}`} />
        <div className={`mt-4 h-4 w-full max-w-2xl ${block}`} />
        <div className={`mt-2 h-4 w-2/3 max-w-xl ${block}`} />
        <div className={`mt-5 h-11 w-44 ${block}`} />
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="bg-ticket">
              <div className="p-2.5 pb-0">
                <div className={`aspect-2/3 ${block}`} />
                <div className={`mt-3 h-5 w-4/5 ${block}`} />
              </div>
              <div className="pt-3">
                <Perforation small />
                <div className="grid grid-cols-2 gap-2 p-2.5">
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
