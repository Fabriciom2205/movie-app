import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WallCard, WallTicket } from "@/app/ticket";
import { quietButtonOnArt, sectionLabel, wallColumn } from "@/app/ui";
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

  // No panel: the how-to is a ticket taped to the wall, and each movie is a
  // small ticket on the wall under it (MASTER.md "Rating grid").
  return (
    <main id="content" className={`${wallColumn} max-w-4xl`}>
      {/* Done, and across from it your count: a small pink side ticket like
          the home page's nudge to come here (pink = your taste), its notches
          cut through to the room. Up here, not in a row of its own, so the
          first movies' buttons fit on a phone's first screen. */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className={`${quietButtonOnArt} -ml-2`}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Done
        </Link>
        <WallTicket tilt="rotate-[0.8deg]" className="shrink-0">
          <p className="side-notches-cut flex items-baseline gap-3 bg-ticket-pink px-7.5 py-2.5">
            <span className={sectionLabel}>Rated so far</span>
            <span className="font-heading text-3xl leading-none">{ratedCount}</span>
          </p>
        </WallTicket>
      </div>

      {/* On paper, not on the art: it's too long for the art, and it's what
          explains the thumb buttons. */}
      <WallCard tape className="mt-7 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl">Rate movies you&rsquo;ve seen</h1>
        <p className="mt-3 text-sm leading-relaxed">
          Thumbs up if you liked it, thumbs down if it wasn&rsquo;t for you, or skip anything you haven&rsquo;t
          seen. Every rating teaches the recommender your taste, and movies you&rsquo;ve rated won&rsquo;t be
          recommended to you.
        </p>
      </WallCard>

      <RateGrid movies={movies} moreUrl={moreUrl} />
    </main>
  );
}
