import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  discoverMovies,
  getMovieWithProviders,
  getRecommendations,
  type MovieListItem,
  type MovieWithProviders,
  type WatchProvider,
} from "@/lib/tmdb";
import {
  findFirstAvailable,
  rankRecommendations,
  type CandidateMovie,
  type Reason,
  type Verdict,
} from "@/lib/recommend-rules";

// Recommends ONE movie for tonight: loads what the rules in recommend-rules.ts
// need (people, ratings, lists, services, TMDB candidates), runs them, and
// turns the answer into names and sentences for the page.

export type RecommendRequest = {
  watcherIds: string[]; // you and/or people you share a list with; empty = just you
  genreIds: number[]; // tonight's mood chips; empty = any genre
  skip: number[]; // movies already shown or ruled out ("Pick another")
};

export type Person = { id: string; name: string; isMe: boolean };

export type ReasonLine = { kind: Reason["kind"]; text: string };

export type RecommendResult = {
  watchers: Person[];
  pick: {
    movie: MovieWithProviders; // details for the page: poster, runtime, genres...
    services: WatchProvider[]; // where the watchers can stream it
    reasons: ReasonLine[]; // strongest first
    dislikedBy: string[]; // names of people not watching who said "not for me"
  } | null;
  nextSkip: number[]; // skip list for "Pick another"
  moreLeft: boolean;
  problem: "noServices" | "nothingFound" | null;
  watchersWithoutServices: string[]; // names
};

const MAX_SEEDS = 10; // most recent likes to base "because you liked" on
const DISCOVER_PAGES = 2; // 20 movies each
const MAX_SKIP = 100; // keeps "Pick another" URLs a sane length

type RatingRow = {
  user_id: string;
  movie_id: number;
  verdict: Verdict;
  created_at: string;
  movies: { title: string; genre_ids: number[] | null } | null;
};
type ListItemRow = {
  movie_id: number;
  lists: { name: string } | null;
  movies: { title: string; genre_ids: number[] | null } | null;
};

export async function recommendMovie(userId: string, req: RecommendRequest): Promise<RecommendResult> {
  const supabase = await createClient();

  // RLS limits each of these to you and the people you share a list with.
  const [profiles, settings, ratings, listItems] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name"),
    supabase.from("user_settings").select("region").eq("user_id", userId).maybeSingle(),
    supabase
      .from("ratings")
      .select("user_id, movie_id, verdict, created_at, movies(title, genre_ids)")
      .order("created_at", { ascending: false })
      .overrideTypes<RatingRow[], { merge: false }>(),
    supabase
      .from("list_items")
      .select("movie_id, lists(name), movies(title, genre_ids)")
      .overrideTypes<ListItemRow[], { merge: false }>(),
  ]);
  if (profiles.error) throw profiles.error;
  if (settings.error) throw settings.error;
  if (ratings.error) throw ratings.error;
  if (listItems.error) throw listItems.error;

  const names = new Map(profiles.data.map((p) => [p.user_id, p.display_name]));
  const person = (id: string): Person => ({ id, name: names.get(id) ?? "Someone", isMe: id === userId });

  // Only people you can see can watch; ignore anything else in the URL.
  const requested = req.watcherIds.filter((id) => names.has(id));
  const watcherIds = requested.length ? requested : [userId];
  const watchers = new Set(watcherIds);
  const region = settings.data?.region ?? "US";

  const services = await supabase
    .from("user_services")
    .select("user_id, provider_id")
    .in("user_id", watcherIds);
  if (services.error) throw services.error;
  const watcherServices = new Set(services.data.map((s) => s.provider_id));
  const withServices = new Set(services.data.map((s) => s.user_id));
  const watchersWithoutServices = watcherIds.filter((id) => !withServices.has(id)).map((id) => person(id).name);

  const empty = {
    watchers: watcherIds.map(person),
    pick: null,
    nextSkip: req.skip,
    moreLeft: false,
    watchersWithoutServices,
  };
  // Nothing can be confirmed as streaming without services; don't ask TMDB.
  if (watcherServices.size === 0) return { ...empty, problem: "noServices" };

  // Seeds: the watchers' most recent likes, each with everyone watching who liked it.
  const seeds = new Map<number, { id: number; title: string; likedBy: string[] }>();
  for (const r of ratings.data) {
    if (r.verdict !== "up" || !watchers.has(r.user_id) || !r.movies) continue;
    const seed = seeds.get(r.movie_id);
    if (seed) seed.likedBy.push(r.user_id);
    else if (seeds.size < MAX_SEEDS) {
      seeds.set(r.movie_id, { id: r.movie_id, title: r.movies.title, likedBy: [r.user_id] });
    }
  }

  const [recommendations, discovered] = await Promise.all([
    Promise.all([...seeds.values()].map(async (seed) => ({ seed, movies: await getRecommendations(seed.id) }))),
    Promise.all(
      Array.from({ length: DISCOVER_PAGES }, (_, i) =>
        discoverMovies({ region, providerIds: [...watcherServices], genreIds: req.genreIds, page: i + 1 }),
      ),
    ).then((pages) => pages.flat()),
  ]);

  const genreFilter = new Set(req.genreIds);
  const ranked = rankRecommendations({
    watchers,
    ratings: ratings.data.flatMap((r) =>
      r.movies
        ? [{ userId: r.user_id, movie: fromCache(r.movie_id, r.movies), verdict: r.verdict }]
        : [],
    ),
    seedRecommendations: recommendations.map(({ seed, movies }) => ({ seed, movies: movies.map(fromTmdb) })),
    discovered: discovered.map(fromTmdb),
    listItems: listItems.data.flatMap((i) =>
      i.movies && i.lists ? [{ movie: fromCache(i.movie_id, i.movies), listName: i.lists.name }] : [],
    ),
    genreFilter,
    skip: new Set(req.skip),
    random: Math.random,
  });

  const found = await findFirstAvailable(ranked, {
    getDetails: (id) => getMovieWithProviders(id, region),
    watcherServices,
    genreFilter,
  });

  const shown = found.pick ? [found.pick.ranked.movie.id] : [];
  const nextSkip = [...req.skip, ...found.ruledOut, ...shown].slice(-MAX_SKIP);

  if (!found.pick) return { ...empty, nextSkip, moreLeft: found.moreLeft, problem: "nothingFound" };

  return {
    ...empty,
    pick: {
      movie: found.pick.details,
      services: found.pick.services,
      reasons: found.pick.ranked.reasons.map((r) => ({ kind: r.kind, text: describe(r, person) })),
      dislikedBy: found.pick.ranked.dislikedBy.map((id) => person(id).name),
    },
    nextSkip,
    moreLeft: found.moreLeft,
    problem: null,
  };
}

function fromTmdb(m: MovieListItem): CandidateMovie {
  return { id: m.id, title: m.title, genreIds: m.genre_ids, voteAverage: m.vote_average };
}

// Our cache doesn't keep TMDB's rating; genres may still be unknown (null).
function fromCache(id: number, m: { title: string; genre_ids: number[] | null }): CandidateMovie {
  return { id, title: m.title, genreIds: m.genre_ids, voteAverage: null };
}

// One reason as a sentence: "Alex liked it", "Because you liked Dune and Arrival"...
function describe(reason: Reason, person: (id: string) => Person): string {
  const who = (ids: string[]) => joinWords([...new Set(ids)].map((id) => (person(id).isMe ? "you" : person(id).name)));
  switch (reason.kind) {
    case "friendsLiked":
      return capitalize(`${who(reason.userIds)} liked it`); // "you" when you're not watching
    case "becauseYouLiked": {
      const titles = reason.seeds.map((s) => s.title);
      const shown = titles.length > 3 ? [...titles.slice(0, 2), `${titles.length - 2} more`] : titles;
      return `Because ${who(reason.seeds.flatMap((s) => s.likedBy))} liked ${joinWords(shown)}`;
    }
    case "onList":
      return `On your ${joinWords(reason.listNames)} ${reason.listNames.length === 1 ? "list" : "lists"}`;
    case "wellRated":
      return `Rated ${reason.voteAverage.toFixed(1)} on TMDB`;
  }
}

// ["a"] -> "a", ["a", "b"] -> "a and b", ["a", "b", "c"] -> "a, b and c"
function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
