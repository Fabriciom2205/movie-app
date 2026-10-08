import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMovie } from "@/lib/tmdb";

// Make sure a movie is in our shared `movies` table, so ratings and list items
// (which reference it) can be saved. Details always come from TMDB on the
// server, never from the browser, so users can't put fake data in the cache.
// Returns false if TMDB has no movie with this id.
export async function ensureMovieCached(movieId: number): Promise<boolean> {
  const movie = await getMovie(movieId);
  if (!movie) return false;

  const supabase = createAdminClient();
  const { error } = await supabase.from("movies").upsert({
    id: movie.id,
    title: movie.title,
    release_date: movie.release_date || null, // TMDB uses "" for unknown
    poster_path: movie.poster_path,
    overview: movie.overview || null,
    runtime: movie.runtime || null, // TMDB uses 0 for unknown; our check needs > 0
    genre_ids: movie.genres.map((g) => g.id), // lets the recommender learn your genres
    cached_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Couldn't cache movie ${movieId}: ${error.message}`);

  return true;
}
