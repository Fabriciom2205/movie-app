import { card, posterGrid, sectionLabel } from "@/app/ui";

// Shown right away while the recommender checks what's streaming (live TMDB
// data): the pick card's shape in soft blue, laid out like page.tsx, so the
// movie drops into place instead of the page jumping. Pulses only if the
// device allows motion.
export default function PickLoading() {
  const block = "rounded-full bg-soft motion-safe:animate-pulse";
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <div className="h-10" /> {/* where the back link goes */}
      <p aria-live="polite" className={`mt-4 ${sectionLabel}`}>
        Finding something for tonight…
      </p>
      <div aria-hidden="true" className={`mt-3 shadow-soft ${card} ${posterGrid}`}>
        <div className="aspect-2/3 rounded-poster bg-soft motion-safe:animate-pulse sm:row-span-2" />
        <div className="flex flex-col gap-3 self-center sm:self-start">
          <div className={`h-8 w-4/5 ${block}`} />
          <div className={`h-4 w-1/2 ${block}`} />
        </div>
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1 sm:col-start-2">
          <div className="flex flex-wrap gap-2">
            <div className={`h-7 w-48 ${block}`} />
            <div className={`h-7 w-36 ${block}`} />
          </div>
          <div className={`mt-2 h-4 w-full ${block}`} />
          <div className={`h-4 w-full ${block}`} />
          <div className={`h-4 w-2/3 ${block}`} />
        </div>
      </div>
    </main>
  );
}
