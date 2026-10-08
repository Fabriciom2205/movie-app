// Unit tests for the recommender's rules. Run with `npm test`.
// TMDB is passed in as a function, so these tests fake it: no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findFirstAvailable,
  rankRecommendations,
  type CandidateMovie,
  type RankedMovie,
  type RecommendInput,
} from "./recommend-rules.ts";

const ME = "me";
const FRIEND = "friend";
const SCI_FI = 878;
const COMEDY = 35;
const NETFLIX = { provider_id: 8, provider_name: "Netflix", logo_path: "/n.jpg", display_priority: 0 };
const PEACOCK = { provider_id: 386, provider_name: "Peacock", logo_path: "/p.jpg", display_priority: 1 };

// A plain, average movie unless a test says otherwise.
const movie = (id: number, extra: Partial<CandidateMovie> = {}): CandidateMovie => ({
  id,
  title: `Movie ${id}`,
  genreIds: [COMEDY],
  voteAverage: 6.5,
  ...extra,
});

function rank(overrides: Partial<RecommendInput> = {}) {
  return rankRecommendations({
    watchers: new Set([ME]),
    ratings: [],
    seedRecommendations: [],
    discovered: [],
    listItems: [],
    genreFilter: new Set(),
    skip: new Set(),
    random: () => 0, // no randomness unless a test adds it
    ...overrides,
  });
}
const ids = (ranked: RankedMovie[]) => ranked.map((r) => r.movie.id);

// ---- What gets ruled out ----

test("anything someone watching has rated is ruled out", () => {
  const ranked = rank({
    discovered: [movie(1), movie(2)],
    ratings: [{ userId: ME, movie: movie(1), verdict: "down" }],
  });
  assert.deepEqual(ids(ranked), [2]);
});

test("a rating by someone NOT watching doesn't rule a movie out", () => {
  const ranked = rank({
    discovered: [movie(1)],
    ratings: [{ userId: FRIEND, movie: movie(1), verdict: "down" }],
  });
  assert.deepEqual(ids(ranked), [1]);
});

test("movies already shown are skipped", () => {
  const ranked = rank({ discovered: [movie(1), movie(2)], skip: new Set([1]) });
  assert.deepEqual(ids(ranked), [2]);
});

test("mood chips drop movies of other genres, but keep ones whose genres are unknown", () => {
  const ranked = rank({
    discovered: [movie(1, { genreIds: [SCI_FI] }), movie(2, { genreIds: [COMEDY] })],
    listItems: [{ movie: movie(3, { genreIds: null }), listName: "Weekend" }],
    genreFilter: new Set([SCI_FI]),
  });
  assert.deepEqual(ids(ranked).sort(), [1, 3]);
});

// ---- What pushes a movie up or down ----

test("a non-watching friend's like is the strongest signal", () => {
  const ranked = rank({
    discovered: [movie(1, { voteAverage: 9 })],
    listItems: [{ movie: movie(2), listName: "Weekend" }],
    seedRecommendations: [
      { seed: { id: 100, title: "Dune", likedBy: [ME] }, movies: [movie(3)] },
    ],
    ratings: [{ userId: FRIEND, movie: movie(4), verdict: "up" }],
  });
  assert.equal(ids(ranked)[0], 4);
  assert.deepEqual(ranked[0].reasons[0], { kind: "friendsLiked", userIds: [FRIEND] });
});

test("a friend's 'not for me' pushes a movie down", () => {
  const ranked = rank({
    discovered: [movie(1), movie(2)],
    ratings: [{ userId: FRIEND, movie: movie(1), verdict: "down" }],
  });
  assert.deepEqual(ids(ranked), [2, 1]);
  assert.deepEqual(ranked[1].dislikedBy, [FRIEND]);
});

test("being recommended by more of your likes counts more", () => {
  const ranked = rank({
    seedRecommendations: [
      { seed: { id: 100, title: "Dune", likedBy: [ME] }, movies: [movie(1), movie(2)] },
      { seed: { id: 101, title: "Arrival", likedBy: [ME] }, movies: [movie(2)] },
    ],
  });
  assert.deepEqual(ids(ranked), [2, 1]);
  assert.deepEqual(ranked[0].reasons[0], {
    kind: "becauseYouLiked",
    seeds: [
      { title: "Dune", likedBy: [ME] },
      { title: "Arrival", likedBy: [ME] },
    ],
  });
});

test("a movie on your list beats an equally good one you didn't save", () => {
  const ranked = rank({
    discovered: [movie(1)],
    listItems: [{ movie: movie(2), listName: "Weekend" }],
  });
  assert.deepEqual(ids(ranked), [2, 1]);
  assert.deepEqual(ranked[0].reasons, [{ kind: "onList", listNames: ["Weekend"] }]);
});

test("genres you like rank higher, genres you dislike lower", () => {
  const ranked = rank({
    discovered: [movie(1, { genreIds: [COMEDY] }), movie(2, { genreIds: [SCI_FI] })],
    ratings: [
      { userId: ME, movie: movie(10, { genreIds: [SCI_FI] }), verdict: "up" },
      { userId: ME, movie: movie(11, { genreIds: [SCI_FI] }), verdict: "up" },
      { userId: ME, movie: movie(12, { genreIds: [COMEDY] }), verdict: "down" },
    ],
  });
  assert.deepEqual(ids(ranked), [2, 1]);
  assert.ok(ranked[0].score > 0 && ranked[1].score < 0);
});

test("a higher TMDB rating ranks higher, all else equal", () => {
  const ranked = rank({
    discovered: [movie(1, { voteAverage: 6.1 }), movie(2, { voteAverage: 8.2 }), movie(3, { voteAverage: 7 })],
  });
  assert.deepEqual(ids(ranked), [2, 3, 1]);
  assert.deepEqual(ranked[0].reasons, [{ kind: "wellRated", voteAverage: 8.2 }]);
});

test("randomness can reorder close calls but never beats a friend's like", () => {
  // The worst luck for the friend's pick, the best for the 9.5-rated one.
  let call = 0;
  const ranked = rank({
    discovered: [movie(1, { voteAverage: 9.5 })],
    ratings: [{ userId: FRIEND, movie: movie(2, { voteAverage: null }), verdict: "up" }],
    random: () => (call++ === 0 ? 1 : 0),
  });
  assert.deepEqual(ids(ranked), [2, 1]);
});

test("randomness can lift a movie past one with an extra 'because you liked'", () => {
  // Movie 1 is recommended by two of your likes, movie 2 by one; luck favors 2.
  const luck = [0, 1];
  let call = 0;
  const ranked = rank({
    seedRecommendations: [
      { seed: { id: 100, title: "Dune", likedBy: [ME] }, movies: [movie(1), movie(2)] },
      { seed: { id: 101, title: "Arrival", likedBy: [ME] }, movies: [movie(1)] },
    ],
    random: () => luck[call++],
  });
  assert.deepEqual(ids(ranked), [2, 1]);
});

test("randomness does reorder movies that are otherwise tied", () => {
  const values = [0.1, 0.9];
  let call = 0;
  const ranked = rank({ discovered: [movie(1), movie(2)], random: () => values[call++] });
  assert.deepEqual(ids(ranked), [2, 1]);
});

// ---- Merging sources ----

test("a movie found by several sources appears once, with every reason, strongest first", () => {
  const shared = movie(1, { voteAverage: null, genreIds: null });
  const ranked = rank({
    discovered: [movie(1, { voteAverage: 7.8, genreIds: [SCI_FI] })],
    listItems: [{ movie: shared, listName: "Weekend" }],
    seedRecommendations: [{ seed: { id: 100, title: "Dune", likedBy: [ME] }, movies: [shared] }],
    ratings: [{ userId: FRIEND, movie: shared, verdict: "up" }],
  });
  assert.equal(ranked.length, 1);
  assert.deepEqual(ranked[0].movie.genreIds, [SCI_FI]); // filled in from discover
  assert.deepEqual(
    ranked[0].reasons.map((r) => r.kind),
    ["friendsLiked", "becauseYouLiked", "onList", "wellRated"],
  );
});

// ---- Finding one that actually streams ----

const ranked = (...movieIds: number[]): RankedMovie[] =>
  movieIds.map((id) => ({ movie: movie(id), score: 0, reasons: [], dislikedBy: [] }));
const details = (providers: (typeof NETFLIX)[], genres = [COMEDY]) => ({
  genres: genres.map((id) => ({ id })),
  providers: { flatrate: providers },
});

test("picks the best-ranked movie that streams on a watcher's service", async () => {
  const where: Record<number, (typeof NETFLIX)[]> = { 1: [PEACOCK], 2: [NETFLIX, PEACOCK], 3: [NETFLIX] };
  const result = await findFirstAvailable(ranked(1, 2, 3), {
    getDetails: async (id) => details(where[id]),
    watcherServices: new Set([8]),
    genreFilter: new Set(),
  });
  assert.equal(result.pick?.ranked.movie.id, 2);
  assert.deepEqual(result.pick?.services.map((s) => s.provider_id), [8]);
  assert.deepEqual(result.ruledOut, [1]);
  assert.equal(result.moreLeft, true);
});

test("asks TMDB in batches and stops once a batch has a hit", async () => {
  const asked: number[] = [];
  const result = await findFirstAvailable(ranked(...Array.from({ length: 30 }, (_, i) => i + 1)), {
    getDetails: async (id) => {
      asked.push(id);
      return details(id === 10 ? [NETFLIX] : [PEACOCK]);
    },
    watcherServices: new Set([8]),
    genreFilter: new Set(),
    batchSize: 8,
  });
  assert.equal(result.pick?.ranked.movie.id, 10);
  assert.equal(asked.length, 16); // two batches of 8, not all 30
});

test("checks unknown genres against TMDB when mood chips are on", async () => {
  const result = await findFirstAvailable(ranked(1, 2), {
    getDetails: async (id) => details([NETFLIX], id === 1 ? [COMEDY] : [SCI_FI]),
    watcherServices: new Set([8]),
    genreFilter: new Set([SCI_FI]),
  });
  assert.equal(result.pick?.ranked.movie.id, 2);
  assert.deepEqual(result.ruledOut, [1]);
});

test("gives up after maxChecks and says whether more are left", async () => {
  const result = await findFirstAvailable(ranked(1, 2, 3, 4, 5), {
    getDetails: async () => null, // not on TMDB / not in this region
    watcherServices: new Set([8]),
    genreFilter: new Set(),
    maxChecks: 3,
  });
  assert.equal(result.pick, null);
  assert.deepEqual(result.ruledOut, [1, 2, 3]);
  assert.equal(result.moreLeft, true);
});

test("the last candidate leaves nothing more", async () => {
  const result = await findFirstAvailable(ranked(1), {
    getDetails: async () => details([NETFLIX]),
    watcherServices: new Set([8]),
    genreFilter: new Set(),
  });
  assert.equal(result.pick?.ranked.movie.id, 1);
  assert.equal(result.moreLeft, false);
});
