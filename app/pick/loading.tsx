import { MovieCardSkeleton } from "@/app/movie-card-skeleton";
import { sectionLabel } from "@/app/ui";

// Shown right away while the recommender checks what's streaming (live TMDB
// data): the pick card's shape, laid out like page.tsx.
export default function PickLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <div className="h-10" /> {/* where the back link goes */}
      <p aria-live="polite" className={`mt-4 ${sectionLabel}`}>
        Finding something for tonight…
      </p>
      <MovieCardSkeleton className="mt-3" />
    </main>
  );
}
