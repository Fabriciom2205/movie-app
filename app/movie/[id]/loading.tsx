import { MovieCardSkeleton } from "@/app/movie-card-skeleton";

// Shown right away after tapping a movie (search results, /pick, a list)
// while its details and providers load from TMDB, laid out like page.tsx.
export default function MovieLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <div className="h-10" /> {/* where the back link goes */}
      <p aria-live="polite" className="sr-only">
        Loading the movie…
      </p>
      <MovieCardSkeleton className="mt-4" />
    </main>
  );
}
