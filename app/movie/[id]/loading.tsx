import { MovieCardSkeleton } from "@/app/movie-card-skeleton";
import { pagePanel } from "@/app/ui";

// Shown right away after tapping a movie (search results, /pick, a list)
// while its details and providers load from TMDB, laid out like page.tsx.
// The message is printed on the ticket's band, the same size as "Feature
// presentation", so nothing moves when the movie arrives.
export default function MovieLoading() {
  return (
    <main id="content" className={`${pagePanel} max-w-3xl`}>
      <div className="h-11" /> {/* where the back link goes */}
      <MovieCardSkeleton className="mt-4">
        <p
          aria-live="polite"
          className="bg-primary px-5 pt-2.5 pb-2 font-heading text-3xl leading-none tracking-wide text-on-primary uppercase sm:px-6"
        >
          Loading the movie…
        </p>
      </MovieCardSkeleton>
    </main>
  );
}
