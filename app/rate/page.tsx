import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWellKnownMovies, releaseYear, tmdbImageUrl } from "@/lib/tmdb";
import { RateGrid, type RateMovie } from "./rate-grid";

const MAX_PAGE = 499; // TMDB serves at most 500 pages

// "Rate movies you've seen": teaches the recommender your taste quickly.
// Shows the best-known movies (most TMDB votes), minus ones you've rated.
// /rate?page=3 shows the next batch (each batch is two TMDB pages).
export default async function RatePage(props: PageProps<"/rate">) {
  const { page: pageParam } = await props.searchParams;
  const asked = Number(pageParam);
  const page = Number.isSafeInteger(asked) && asked >= 1 && asked <= MAX_PAGE ? asked : 1;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect("/login");

  const [mine, first, second] = await Promise.all([
    // Your own ratings only: list-mates' ratings are readable too.
    supabase.from("ratings").select("movie_id").eq("user_id", userId),
    getWellKnownMovies(page),
    getWellKnownMovies(page + 1),
  ]);
  if (mine.error) throw mine.error;

  const rated = new Set(mine.data.map((r) => r.movie_id));
  const seen = new Set<number>();
  const movies: RateMovie[] = [...first, ...second]
    .filter((m) => !rated.has(m.id) && !seen.has(m.id) && seen.add(m.id))
    .map((m) => ({
      id: m.id,
      title: m.title,
      year: releaseYear(m.release_date),
      // Built here because lib/tmdb.ts is server-only.
      posterUrl: m.poster_path ? tmdbImageUrl(m.poster_path, "w185") : null,
    }));

  const ratedCount = rated.size;
  const moreUrl = page + 2 <= MAX_PAGE ? `/rate?page=${page + 2}` : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-muted hover:underline">
        ← Done
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Rate movies you&rsquo;ve seen</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Every rating teaches the recommender what you like, and movies you&rsquo;ve rated won&rsquo;t be
        recommended to you. Skip anything you haven&rsquo;t seen.
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        {ratedCount === 0
          ? "No ratings yet."
          : `You've rated ${ratedCount} ${ratedCount === 1 ? "movie" : "movies"} so far.`}
      </p>

      <RateGrid movies={movies} moreUrl={moreUrl} />
    </main>
  );
}
