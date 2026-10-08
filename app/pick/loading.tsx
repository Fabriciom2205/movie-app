import { MovieCardSkeleton } from "@/app/movie-card-skeleton";
import { pagePanel, sectionLabel } from "@/app/ui";

// Shown right away while the recommender checks what's streaming (live TMDB
// data): the pick card's shape, laid out like page.tsx.
export default function PickLoading() {
  return (
    <main id="content" className={`${pagePanel} max-w-3xl`}>
      <div className="h-10" /> {/* where the back link goes */}
      <p aria-live="polite" className={`mt-4 ${sectionLabel}`}>
        Finding something for tonight…
      </p>
      <MovieCardSkeleton className="mt-3" />
    </main>
  );
}
