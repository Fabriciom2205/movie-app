import "server-only";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

// Only the fields we actually use. TMDB returns more.
export type MovieSearchResult = {
  id: number;
  title: string;
  release_date: string; // "YYYY-MM-DD", or "" when unknown
  poster_path: string | null;
  overview: string;
};

type SearchResponse = {
  page: number;
  results: MovieSearchResult[];
  total_pages: number;
  total_results: number;
};

export type MovieDetails = MovieSearchResult & {
  runtime: number | null; // minutes; TMDB uses 0 or null when unknown
  genres: { id: number; name: string }[];
  tagline: string;
};

export type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
};

// One country's availability. Each category is missing when empty.
export type WatchProviders = {
  link: string; // TMDB's "where to watch" page for this movie
  flatrate?: WatchProvider[]; // included with a subscription
  free?: WatchProvider[];
  ads?: WatchProvider[]; // free with ads
  rent?: WatchProvider[];
  buy?: WatchProvider[];
};

// A movie as TMDB lists it in discover and recommendations results.
export type MovieListItem = MovieSearchResult & {
  genre_ids: number[];
  vote_average: number; // 0-10
  vote_count: number;
  popularity: number;
};

type MovieListResponse = {
  page: number;
  results: MovieListItem[];
  total_pages: number;
  total_results: number;
};

export type Genre = { id: number; name: string };

// Details plus where to watch in one region, from a single request.
export type MovieWithProviders = MovieDetails & {
  vote_average: number;
  vote_count: number;
  providers: WatchProviders | null; // null: not available in this region
};

type MovieWithProvidersResponse = MovieDetails & {
  vote_average: number;
  vote_count: number;
  "watch/providers": { results: Record<string, WatchProviders> };
};

type WatchProvidersResponse = {
  id: number;
  results: Record<string, WatchProviders>; // keyed by country code, e.g. "US"
};

// From the provider list endpoint: every service TMDB knows in a region.
type ProviderListResponse = {
  results: WatchProvider[];
};

export type Region = {
  iso_3166_1: string; // "US"
  english_name: string; // "United States of America"
};

type RegionsResponse = {
  results: Region[];
};

export class TmdbError extends Error {
  constructor(
    public status: number,
    path: string,
  ) {
    super(`TMDB request failed: ${status} (${path})`);
  }
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token || token === "paste-your-token-here") {
    throw new Error(
      "TMDB_READ_TOKEN is not set. Add it to .env.local and restart the dev server.",
    );
  }

  const url = new URL(TMDB_BASE_URL + path);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new TmdbError(res.status, path);
  }

  return res.json() as Promise<T>;
}

export async function searchMovies(query: string): Promise<MovieSearchResult[]> {
  const data = await tmdbFetch<SearchResponse>("/search/movie", {
    query,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });
  return data.results;
}

// Returns null when TMDB has no movie with this id.
export async function getMovie(id: number): Promise<MovieDetails | null> {
  try {
    return await tmdbFetch<MovieDetails>(`/movie/${id}`, { language: "en-US" });
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) return null;
    throw err;
  }
}

// Live availability. Deliberately not cached: it changes often.
// Returns null when the movie isn't available in this region (or doesn't exist).
export async function getWatchProviders(
  id: number,
  region = "US",
): Promise<WatchProviders | null> {
  try {
    const data = await tmdbFetch<WatchProvidersResponse>(`/movie/${id}/watch/providers`);
    return data.results[region] ?? null;
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) return null;
    throw err;
  }
}

// All streaming services in a region (~300 in the US), sorted by TMDB's
// display_priority. That ranking is noisy, so callers pick their own shortlist.
export async function getProviderList(region: string): Promise<WatchProvider[]> {
  const data = await tmdbFetch<ProviderListResponse>("/watch/providers/movie", {
    watch_region: region,
    language: "en-US",
  });
  return data.results.sort((a, b) => a.display_priority - b.display_priority);
}

// Countries TMDB has availability data for, sorted by name.
export async function getRegions(): Promise<Region[]> {
  const data = await tmdbFetch<RegionsResponse>("/watch/providers/regions", {
    language: "en-US",
  });
  return data.results.sort((a, b) => a.english_name.localeCompare(b.english_name));
}

// Movies streaming on any of these services in a region (subscription, free
// or free with ads, the same rule the picker uses), optionally in any of these
// genres. Most popular first; very obscure titles are left out.
export async function discoverMovies(options: {
  region: string;
  providerIds: number[];
  genreIds?: number[];
  page?: number;
}): Promise<MovieListItem[]> {
  // With no services, TMDB would ignore the filter and return everything.
  if (options.providerIds.length === 0) return [];

  const data = await tmdbFetch<MovieListResponse>("/discover/movie", {
    watch_region: options.region,
    with_watch_providers: options.providerIds.join("|"), // "|" means OR
    with_watch_monetization_types: "flatrate|free|ads",
    ...(options.genreIds?.length ? { with_genres: options.genreIds.join("|") } : {}),
    sort_by: "popularity.desc",
    "vote_count.gte": "200",
    include_adult: "false",
    language: "en-US",
    page: String(options.page ?? 1),
  });
  return data.results;
}

// The movies with the most TMDB votes (Interstellar, Inception, The Dark
// Knight...): the ones people are most likely to have seen. 20 per page.
export async function getWellKnownMovies(page = 1): Promise<MovieListItem[]> {
  const data = await tmdbFetch<MovieListResponse>("/discover/movie", {
    sort_by: "vote_count.desc",
    include_adult: "false",
    language: "en-US",
    page: String(page),
  });
  return data.results;
}

// TMDB's "if you liked this" list for one movie (first page, up to 20).
// Says nothing about where they stream. Empty when the movie doesn't exist.
export async function getRecommendations(id: number): Promise<MovieListItem[]> {
  try {
    const data = await tmdbFetch<MovieListResponse>(`/movie/${id}/recommendations`, {
      language: "en-US",
      page: "1",
    });
    return data.results;
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) return [];
    throw err;
  }
}

// All movie genres, e.g. { id: 35, name: "Comedy" }.
export async function getMovieGenres(): Promise<Genre[]> {
  const data = await tmdbFetch<{ genres: Genre[] }>("/genre/movie/list", { language: "en-US" });
  return data.genres;
}

// Details (runtime, genres, rating) and where to watch, in ONE request instead
// of two, using TMDB's append_to_response. Returns null for an unknown movie.
export async function getMovieWithProviders(
  id: number,
  region: string,
): Promise<MovieWithProviders | null> {
  try {
    const { "watch/providers": watch, ...movie } = await tmdbFetch<MovieWithProvidersResponse>(
      `/movie/${id}`,
      { language: "en-US", append_to_response: "watch/providers" },
    );
    return { ...movie, providers: watch.results[region] ?? null };
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) return null;
    throw err;
  }
}

// TMDB serves pre-sized images. w92 suits logos, w185 thumbnails, w342+ detail posters.
export function tmdbImageUrl(
  path: string,
  size: "w92" | "w185" | "w342" | "w500" = "w185",
) {
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function releaseYear(releaseDate: string): string | null {
  return releaseDate ? releaseDate.slice(0, 4) : null;
}

// 170 -> "2h 50m"
export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
