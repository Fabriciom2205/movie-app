import "server-only";
import { getDisplayNames } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { getWatchProviders, type WatchProvider } from "@/lib/tmdb";
import { rankCandidates, type Counts, type Movie, type Verdict } from "@/lib/pick-rules";

// Picks ONE movie for tonight from a list: loads what the rules in
// pick-rules.ts need (list, ratings, services, live availability), then
// turns user ids into names for the page.

export type PickRequest = {
  listId: string;
  watcherIds: string[]; // who's watching tonight; members of the list (empty = all)
  maxMinutes: number | null; // null = any length
  skip: number[]; // movie ids already shown
};

export type PickedMovie = Movie & {
  services: WatchProvider[]; // where the watchers can stream it
  likedBy: string[]; // names of non-watchers who liked it
  dislikedBy: string[];
  whereToWatchLink: string | null; // TMDB's page for it
};

export type PickResult = {
  listName: string;
  pick: PickedMovie | null;
  othersLeft: number; // other movies that also qualify (for "Pick another")
  counts: Counts; // why movies were ruled out, for the "nothing fits" message
  watchersWithoutServices: string[]; // names; a common reason for "unavailable"
};

type ItemRow = {
  movie_id: number;
  movies: { title: string; release_date: string | null; poster_path: string | null; runtime: number | null } | null;
};

// Returns null if the list doesn't exist or the user isn't on it.
export async function pickMovie(userId: string, req: PickRequest): Promise<PickResult | null> {
  const supabase = await createClient();

  const [list, members, items, settings] = await Promise.all([
    supabase.from("lists").select("name").eq("id", req.listId).maybeSingle(),
    supabase.from("list_members").select("user_id").eq("list_id", req.listId),
    supabase
      .from("list_items")
      .select("movie_id, movies(title, release_date, poster_path, runtime)")
      .eq("list_id", req.listId)
      .overrideTypes<ItemRow[], { merge: false }>(),
    supabase.from("user_settings").select("region").eq("user_id", userId).maybeSingle(),
  ]);
  if (list.error) throw list.error;
  if (members.error) throw members.error;
  if (items.error) throw items.error;
  if (settings.error) throw settings.error;
  if (!list.data) return null;

  // Only members can watch; ignore anything else in the URL. None left = everyone.
  const memberIds = members.data.map((m) => m.user_id);
  const requested = req.watcherIds.filter((id) => memberIds.includes(id));
  const watchers = requested.length ? requested : memberIds;
  const movieIds = items.data.map((i) => i.movie_id);
  // Your own region: other people's settings aren't readable, and you're the one picking.
  const region = settings.data?.region ?? "US";

  const [ratings, services, names] = await Promise.all([
    movieIds.length
      ? supabase
          .from("ratings")
          .select("user_id, movie_id, verdict")
          .in("movie_id", movieIds)
          .in("user_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    watchers.length
      ? supabase.from("user_services").select("user_id, provider_id").in("user_id", watchers)
      : Promise.resolve({ data: [], error: null }),
    getDisplayNames(memberIds),
  ]);
  if (ratings.error) throw ratings.error;
  if (services.error) throw services.error;

  const movies: Movie[] = items.data.flatMap((i) =>
    i.movies
      ? [
          {
            id: i.movie_id,
            title: i.movies.title,
            releaseDate: i.movies.release_date,
            posterPath: i.movies.poster_path,
            runtime: i.movies.runtime,
          },
        ]
      : [],
  );

  const ranked = await rankCandidates({
    movies,
    watchers: new Set(watchers),
    ratings: ratings.data.map((r) => ({
      userId: r.user_id,
      movieId: r.movie_id,
      verdict: r.verdict as Verdict,
    })),
    watcherServices: new Set(services.data.map((s) => s.provider_id)),
    maxMinutes: req.maxMinutes,
    skip: new Set(req.skip),
    getProviders: (movieId) => getWatchProviders(movieId, region),
    random: Math.random,
  });

  const nameOf = (id: string) => names.get(id) ?? "Someone";
  const top = ranked.ranked[0];
  const servicesByUser = new Set(services.data.map((s) => s.user_id));

  return {
    listName: list.data.name,
    pick: top
      ? {
          ...top.movie,
          services: top.services,
          likedBy: top.likedBy.map(nameOf),
          dislikedBy: top.dislikedBy.map(nameOf),
          whereToWatchLink: top.link,
        }
      : null,
    othersLeft: Math.max(ranked.ranked.length - 1, 0),
    counts: ranked.counts,
    watchersWithoutServices: watchers.filter((id) => !servicesByUser.has(id)).map(nameOf),
  };
}
