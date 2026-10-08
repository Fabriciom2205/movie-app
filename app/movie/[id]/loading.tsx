import { MovieCardSkeleton } from "@/app/movie-card-skeleton";
import { pagePanel } from "@/app/ui";

// Shown right away after tapping a movie (search results, /pick, a list)
// while its details and providers load from TMDB, laid out like page.tsx.
export default function MovieLoading() {
  return (
    <main id="content" className={`${pagePanel} max-w-3xl`}>
      <div className="h-10" /> {/* where the back link goes */}
      <p aria-live="polite" className="sr-only">
        Loading the movie…
      </p>
      <MovieCardSkeleton className="mt-4" />
    </main>
  );
}
