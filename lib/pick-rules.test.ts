// Unit tests for the picker's rules. Run with `npm test` (Node's built-in
// test runner; Node runs TypeScript directly by stripping the types).
// The rules take TMDB as a function, so these tests fake it: no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import { rankCandidates } from "./pick-rules.ts";

const ME = "me";
const FRIEND = "friend";
const NETFLIX = { provider_id: 8, provider_name: "Netflix", logo_path: "/n.jpg", display_priority: 0 };
const TUBI = { provider_id: 73, provider_name: "Tubi TV", logo_path: "/t.jpg", display_priority: 1 };
const PEACOCK = { provider_id: 386, provider_name: "Peacock", logo_path: "/p.jpg", display_priority: 2 };

const movie = (id: number, runtime: number | null = 100) => ({
  id, title: `Movie ${id}`, releaseDate: null, posterPath: null, runtime,
});

// Everything streams on Netflix unless a test says otherwise.
function run(overrides: Partial<Parameters<typeof rankCandidates>[0]> = {}) {
  let r = 0;
  const sequence = [0.9, 0.1, 0.5, 0.3, 0.7]; // deterministic "random"
  return rankCandidates({
    movies: [movie(1), movie(2), movie(3)],
    watchers: new Set([ME]),
    ratings: [],
    watcherServices: new Set([8]),
    maxMinutes: null,
    skip: new Set(),
    getProviders: async () => ({ link: "https://tmdb", flatrate: [NETFLIX] }),
    random: () => sequence[r++ % sequence.length],
    ...overrides,
  });
}

test("with no ratings, ties are broken by the random number", async () => {
  const { ranked } = await run();
  assert.deepEqual(ranked.map((x) => x.movie.id), [2, 3, 1]); // tiebreaks 0.9, 0.1, 0.5
});

test("a non-watching friend's like moves a movie to the top", async () => {
  const { ranked } = await run({ ratings: [{ userId: FRIEND, movieId: 1, verdict: "up" }] });
  assert.equal(ranked[0].movie.id, 1);
  assert.deepEqual(ranked[0].likedBy, [FRIEND]);
});

test("a non-watching friend's 'not for me' moves it to the bottom but keeps it", async () => {
  const { ranked } = await run({ ratings: [{ userId: FRIEND, movieId: 2, verdict: "down" }] });
  assert.equal(ranked.at(-1)!.movie.id, 2);
  assert.equal(ranked.length, 3);
});

test("if the friend is watching too, their rating means 'seen' and rules it out", async () => {
  const { ranked, counts } = await run({
    watchers: new Set([ME, FRIEND]),
    ratings: [{ userId: FRIEND, movieId: 1, verdict: "up" }],
  });
  assert.deepEqual(ranked.map((x) => x.movie.id).sort(), [2, 3]);
  assert.equal(counts.seen, 1);
});

test("my own rating rules a movie out", async () => {
  const { counts, ranked } = await run({ ratings: [{ userId: ME, movieId: 3, verdict: "down" }] });
  assert.equal(counts.seen, 1);
  assert.ok(!ranked.some((x) => x.movie.id === 3));
});

test("time limit drops longer movies, and unknown runtimes only when there is a limit", async () => {
  const movies = [movie(1, 90), movie(2, 121), movie(3, null)];
  const limited = await run({ movies, maxMinutes: 120 });
  assert.deepEqual(limited.ranked.map((x) => x.movie.id), [1]);
  assert.equal(limited.counts.tooLong, 2);
  const any = await run({ movies, maxMinutes: null });
  assert.equal(any.ranked.length, 3);
});

test("only services a watcher has count; free and ads count, rent/buy don't", async () => {
  const providers: Record<number, object> = {
    1: { link: "x", flatrate: [PEACOCK] }, // not ours
    2: { link: "x", ads: [TUBI], free: [TUBI] }, // ours, listed twice
    3: { link: "x", rent: [NETFLIX] }, // only to rent
  };
  const { ranked, counts } = await run({
    watcherServices: new Set([8, 73]),
    getProviders: async (id) => providers[id] as never,
  });
  assert.deepEqual(ranked.map((x) => x.movie.id), [2]);
  assert.deepEqual(ranked[0].services.map((s) => s.provider_id), [73]); // deduped
  assert.equal(counts.unavailable, 2);
});

test("not available in the region at all (null) counts as unavailable", async () => {
  const { ranked, counts } = await run({ getProviders: async () => null });
  assert.equal(ranked.length, 0);
  assert.equal(counts.unavailable, 3);
});

test("skipped movies are left out and never cost a TMDB request", async () => {
  const asked: number[] = [];
  const { ranked, counts } = await run({
    skip: new Set([1, 2]),
    getProviders: async (id) => {
      asked.push(id);
      return { link: "x", flatrate: [NETFLIX] };
    },
  });
  assert.deepEqual(ranked.map((x) => x.movie.id), [3]);
  assert.equal(counts.skipped, 2);
  assert.deepEqual(asked, [3]);
});

test("never more than 8 TMDB requests at once", async () => {
  let inFlight = 0;
  let peak = 0;
  const movies = Array.from({ length: 30 }, (_, i) => movie(i + 1));
  const { ranked } = await run({
    movies,
    getProviders: async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return { link: "x", flatrate: [NETFLIX] };
    },
  });
  assert.equal(ranked.length, 30);
  assert.equal(peak, 8);
});
