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

type WatchProvidersResponse = {
  id: number;
  results: Record<string, WatchProviders>; // keyed by country code, e.g. "US"
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
