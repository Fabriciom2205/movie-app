// The recommender's rules, with no database or network of their own:
// everything comes in as arguments (TMDB through getDetails), so this file can
// be run and unit-tested on its own. Type-only imports keep it free of server code.
//
// rankRecommendations: merge the candidates from every source, rule some out,
//   score the rest, and attach the reasons to show.
// findFirstAvailable: walk that ranking, asking TMDB where each movie streams,
//   until one is on a service someone watching has.

import type { WatchProvider } from "@/lib/tmdb";

export type Verdict = "up" | "down";

// What we know about a movie before asking TMDB about it. Movies from our own
// cache may not know their genres or rating yet (null).
export type CandidateMovie = {
  id: number;
  title: string;
  genreIds: number[] | null;
  voteAverage: number | null; // TMDB, 0-10
};

export type RecommendInput = {
  watchers: Set<string>; // user ids of everyone watching tonight
  // Ratings by the watchers and the people they share lists with.
  ratings: { userId: string; movie: CandidateMovie; verdict: Verdict }[];
  // TMDB recommendations for movies the watchers liked.
  seedRecommendations: { seed: { id: number; title: string; likedBy: string[] }; movies: CandidateMovie[] }[];
  discovered: CandidateMovie[]; // popular on the watchers' services
  listItems: { movie: CandidateMovie; listName: string }[]; // the watchers' lists
  genreFilter: Set<number>; // tonight's mood chips; empty = any genre
  skip: Set<number>; // already shown ("Pick another")
  random: () => number; // Math.random, or a fake in tests
};

// Why a movie was suggested, strongest first. The page turns these into text.
export type Reason =
  | { kind: "friendsLiked"; userIds: string[] }
  | { kind: "becauseYouLiked"; seeds: { title: string; likedBy: string[] }[] }
  | { kind: "onList"; listNames: string[] }
  | { kind: "wellRated"; voteAverage: number };

export type RankedMovie = {
  movie: CandidateMovie;
  score: number;
  reasons: Reason[];
  dislikedBy: string[]; // non-watchers who said "not for me"
};

// How much each signal counts. Personal signals outweigh general quality, and
// the random part can reorder close calls but never beat a friend's like.
export const WEIGHTS = {
  friendLiked: 6, // per non-watcher who liked it
  friendDisliked: -4, // per non-watcher who said "not for me"
  seed: 3, // per liked movie that TMDB says it's like...
  maxSeeds: 3, // ...counting at most this many
  onList: 4, // on at least one of the watchers' lists
  genreAffinity: 3, // at most this much, up or down, from genres you rate well or badly
  quality: 1.5, // per TMDB point above (or below) 6.5...
  maxQuality: 3, // ...capped at this much either way
  noise: 2, // random extra between 0 and this
};
const NEUTRAL_RATING = 6.5;

export function rankRecommendations(input: RecommendInput): RankedMovie[] {
  // ---- Merge every source into one entry per movie ----
  type Entry = {
    movie: CandidateMovie;
    seeds: Map<number, { title: string; likedBy: string[] }>;
    listNames: Set<string>;
  };
  const entries = new Map<number, Entry>();
  function add(movie: CandidateMovie): Entry {
    const existing = entries.get(movie.id);
    if (existing) {
      // Fill in whatever one source knew and another didn't.
      existing.movie = {
        ...existing.movie,
        genreIds: existing.movie.genreIds ?? movie.genreIds,
        voteAverage: existing.movie.voteAverage ?? movie.voteAverage,
      };
      return existing;
    }
    const entry: Entry = { movie, seeds: new Map(), listNames: new Set() };
    entries.set(movie.id, entry);
    return entry;
  }

  for (const m of input.discovered) add(m);
  for (const { seed, movies } of input.seedRecommendations) {
    for (const m of movies) add(m).seeds.set(seed.id, { title: seed.title, likedBy: seed.likedBy });
  }
  for (const { movie, listName } of input.listItems) add(movie).listNames.add(listName);

  // Friends' ratings: who isn't watching tonight, and what they thought.
  const friendLikes = new Map<number, string[]>();
  const friendDislikes = new Map<number, string[]>();
  const seenByWatcher = new Set<number>();
  for (const r of input.ratings) {
    if (input.watchers.has(r.userId)) {
      seenByWatcher.add(r.movie.id);
    } else {
      const map = r.verdict === "up" ? friendLikes : friendDislikes;
      map.set(r.movie.id, [...(map.get(r.movie.id) ?? []), r.userId]);
      if (r.verdict === "up") add(r.movie); // a friend's like is a candidate on its own
    }
  }

  const genreScore = genreAffinityTable(input);

  // ---- Rule out, score, explain ----
  // sortKey = score plus a little luck; the luck isn't part of the reported score.
  const ranked: { item: RankedMovie; sortKey: number }[] = [];
  for (const { movie, seeds, listNames } of entries.values()) {
    if (input.skip.has(movie.id)) continue;
    if (seenByWatcher.has(movie.id)) continue; // someone watching has seen it
    // Unknown genres stay in; findFirstAvailable checks them against TMDB.
    if (input.genreFilter.size > 0 && movie.genreIds && !movie.genreIds.some((g) => input.genreFilter.has(g))) {
      continue;
    }

    const likedBy = friendLikes.get(movie.id) ?? [];
    const dislikedBy = friendDislikes.get(movie.id) ?? [];
    const seedList = [...seeds.values()];

    const score =
      WEIGHTS.friendLiked * likedBy.length +
      WEIGHTS.friendDisliked * dislikedBy.length +
      WEIGHTS.seed * Math.min(seedList.length, WEIGHTS.maxSeeds) +
      (listNames.size > 0 ? WEIGHTS.onList : 0) +
      genreScore(movie.genreIds) +
      qualityScore(movie.voteAverage);

    const reasons: Reason[] = [];
    if (likedBy.length) reasons.push({ kind: "friendsLiked", userIds: likedBy });
    if (seedList.length) reasons.push({ kind: "becauseYouLiked", seeds: seedList });
    if (listNames.size) reasons.push({ kind: "onList", listNames: [...listNames] });
    if (movie.voteAverage !== null && movie.voteAverage >= 7) {
      reasons.push({ kind: "wellRated", voteAverage: movie.voteAverage });
    }

    ranked.push({
      item: { movie, score, reasons, dislikedBy },
      sortKey: score + input.random() * WEIGHTS.noise,
    });
  }

  return ranked.sort((a, b) => b.sortKey - a.sortKey).map((r) => r.item);
}

// How much the watchers like each genre, from their own ratings: +1 per like
// and -1 per "not for me" of a movie in that genre, divided by how many rated
// movies we know the genres of. A movie's affinity adds up its genres' scores,
// limited to +/- WEIGHTS.genreAffinity.
function genreAffinityTable(input: RecommendInput): (genreIds: number[] | null) => number {
  const perGenre = new Map<number, number>();
  let rated = 0;
  for (const r of input.ratings) {
    if (!input.watchers.has(r.userId) || !r.movie.genreIds) continue;
    rated++;
    for (const g of r.movie.genreIds) {
      perGenre.set(g, (perGenre.get(g) ?? 0) + (r.verdict === "up" ? 1 : -1));
    }
  }
  return (genreIds) => {
    if (!genreIds || rated === 0) return 0;
    const sum = genreIds.reduce((total, g) => total + (perGenre.get(g) ?? 0), 0);
    return clamp((sum / rated) * WEIGHTS.genreAffinity, WEIGHTS.genreAffinity);
  };
}

function qualityScore(voteAverage: number | null): number {
  if (voteAverage === null) return 0;
  return clamp((voteAverage - NEUTRAL_RATING) * WEIGHTS.quality, WEIGHTS.maxQuality);
}

function clamp(n: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, n));
}

// ---------------------------------------------------------------------------

// The parts of TMDB's details-plus-providers answer this needs.
type Details = {
  genres: { id: number }[];
  providers: { flatrate?: WatchProvider[]; free?: WatchProvider[]; ads?: WatchProvider[] } | null;
};

export type AvailablePick<D> = {
  ranked: RankedMovie;
  details: D;
  services: WatchProvider[]; // where the watchers can stream it
};

// Asks TMDB about the best-ranked movies, `batchSize` at a time, and returns
// the first one streaming on a watcher's service (subscription, free or with
// ads) and, if movies were missing genres, matching tonight's genres.
// Gives up after `maxChecks` movies so a pick never takes too long.
export async function findFirstAvailable<D extends Details>(
  ranked: RankedMovie[],
  options: {
    getDetails: (movieId: number) => Promise<D | null>;
    watcherServices: Set<number>;
    genreFilter: Set<number>;
    batchSize?: number;
    maxChecks?: number;
  },
): Promise<{ pick: AvailablePick<D> | null; ruledOut: number[]; moreLeft: boolean }> {
  const batchSize = options.batchSize ?? 8;
  const toCheck = ranked.slice(0, options.maxChecks ?? 40);
  const ruledOut: number[] = [];

  for (let start = 0; start < toCheck.length; start += batchSize) {
    const batch = toCheck.slice(start, start + batchSize);
    const details = await Promise.all(batch.map((r) => options.getDetails(r.movie.id)));

    for (let i = 0; i < batch.length; i++) {
      const d = details[i];
      const services = d ? streamingFor(d, options.watcherServices) : [];
      const genresOk =
        options.genreFilter.size === 0 || (d?.genres.some((g) => options.genreFilter.has(g.id)) ?? false);
      if (d && services.length > 0 && genresOk) {
        const index = start + i;
        return {
          pick: { ranked: batch[i], details: d, services },
          ruledOut,
          moreLeft: index < ranked.length - 1,
        };
      }
      ruledOut.push(batch[i].movie.id);
    }
  }
  return { pick: null, ruledOut, moreLeft: ranked.length > toCheck.length };
}

// The watchers' services this movie streams on, each once.
function streamingFor(details: Details, watcherServices: Set<number>): WatchProvider[] {
  const p = details.providers;
  const all = [...(p?.flatrate ?? []), ...(p?.free ?? []), ...(p?.ads ?? [])];
  const seen = new Set<number>();
  return all.filter(
    (s) => watcherServices.has(s.provider_id) && !seen.has(s.provider_id) && seen.add(s.provider_id),
  );
}
