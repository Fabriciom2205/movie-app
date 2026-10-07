// The picker's rules, with no database or network of their own: everything
// comes in as arguments (availability through getProviders), so this file can
// be run and tested on its own. Type-only imports keep it free of server code.
//
// 1. Drop movies already shown this session ("Pick another").
// 2. Drop movies anyone watching tonight has seen (rated).
// 3. Drop movies longer than the time limit (or of unknown length, if there is one).
// 4. Drop movies not streaming on a service anyone watching has.
// 5. Rank the rest: list-mates NOT watching tonight push a movie up by liking
//    it and down by saying "not for me". Ties are broken at random.

import type { WatchProvider } from "@/lib/tmdb";

export type Verdict = "up" | "down";

export type Movie = {
  id: number;
  title: string;
  releaseDate: string | null;
  posterPath: string | null;
  runtime: number | null;
};

export type Counts = { total: number; skipped: number; seen: number; tooLong: number; unavailable: number };

// ---------------------------------------------------------------------------

export type Ranked = {
  movie: Movie;
  services: WatchProvider[];
  link: string | null;
  likedBy: string[]; // user ids
  dislikedBy: string[];
  score: number;
  tiebreak: number;
};

export async function rankCandidates(input: {
  movies: Movie[];
  watchers: Set<string>;
  ratings: { userId: string; movieId: number; verdict: Verdict }[];
  watcherServices: Set<number>;
  maxMinutes: number | null;
  skip: Set<number>;
  getProviders: (movieId: number) => Promise<{
    link: string;
    flatrate?: WatchProvider[];
    free?: WatchProvider[];
    ads?: WatchProvider[];
  } | null>;
  random: () => number;
}): Promise<{ ranked: Ranked[]; counts: Counts }> {
  const counts: Counts = { total: input.movies.length, skipped: 0, seen: 0, tooLong: 0, unavailable: 0 };

  const ratingsByMovie = new Map<number, { userId: string; verdict: Verdict }[]>();
  for (const r of input.ratings) {
    ratingsByMovie.set(r.movieId, [...(ratingsByMovie.get(r.movieId) ?? []), r]);
  }

  // Cheap filters first, so only the survivors cost a TMDB request.
  const survivors: Movie[] = [];
  for (const m of input.movies) {
    const seenByWatcher = (ratingsByMovie.get(m.id) ?? []).some((r) => input.watchers.has(r.userId));
    const tooLong =
      input.maxMinutes !== null && (m.runtime === null || m.runtime > input.maxMinutes);

    if (input.skip.has(m.id)) counts.skipped++;
    else if (seenByWatcher) counts.seen++;
    else if (tooLong) counts.tooLong++;
    else survivors.push(m);
  }

  const providers = await mapWithLimit(survivors, 8, (m) => input.getProviders(m.id));

  const ranked: Ranked[] = [];
  survivors.forEach((movie, i) => {
    const p = providers[i];
    // Subscription, free, or free with ads: anything that needs no extra payment.
    const streamable = [...(p?.flatrate ?? []), ...(p?.free ?? []), ...(p?.ads ?? [])];
    const services = dedupeProviders(streamable.filter((s) => input.watcherServices.has(s.provider_id)));
    if (services.length === 0) {
      counts.unavailable++;
      return;
    }

    // Only people NOT watching tonight affect the ranking.
    const others = (ratingsByMovie.get(movie.id) ?? []).filter((r) => !input.watchers.has(r.userId));
    const likedBy = others.filter((r) => r.verdict === "up").map((r) => r.userId);
    const dislikedBy = others.filter((r) => r.verdict === "down").map((r) => r.userId);

    ranked.push({
      movie,
      services,
      link: p?.link ?? null,
      likedBy,
      dislikedBy,
      score: likedBy.length - dislikedBy.length,
      tiebreak: input.random(),
    });
  });

  ranked.sort((a, b) => b.score - a.score || a.tiebreak - b.tiebreak);
  return { ranked, counts };
}

// Like Promise.all(items.map(fn)), but at most `limit` calls at a time.
async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// A service can appear in more than one category (e.g. free and ads).
function dedupeProviders(providers: WatchProvider[]): WatchProvider[] {
  const seen = new Set<number>();
  return providers.filter((p) => !seen.has(p.provider_id) && seen.add(p.provider_id));
}
