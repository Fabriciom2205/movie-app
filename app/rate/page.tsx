import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SideNotches } from "@/app/ticket";
import { pagePanel, quietButton, sectionLabel } from "@/app/ui";
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
    <main id="content" className={`${pagePanel} max-w-4xl`}>
      <Link href="/" className={`${quietButton} -ml-2`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Done
      </Link>

      <h1 className="mt-4 text-5xl">Rate movies you&rsquo;ve seen</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed">
        Thumbs up if you liked it, thumbs down if it wasn&rsquo;t for you, or skip anything you haven&rsquo;t
        seen. Every rating teaches the recommender your taste, and movies you&rsquo;ve rated won&rsquo;t be
        recommended to you.
      </p>
      {/* A small pink side ticket, like the home page's nudge to come here:
          pink = your taste. */}
      <p className="relative mt-5 inline-flex items-baseline gap-3 bg-ticket-pink px-6 py-2.5">
        <SideNotches />
        <span className={sectionLabel}>Rated so far</span>
        <span className="font-heading text-3xl leading-none">{ratedCount}</span>
      </p>

      <RateGrid movies={movies} moreUrl={moreUrl} />
    </main>
  );
}
