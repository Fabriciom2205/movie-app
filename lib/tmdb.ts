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
    throw new Error(`TMDB request failed: ${res.status} ${res.statusText} (${path})`);
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

// TMDB serves pre-sized images; w185 is a good thumbnail width.
export function posterUrl(posterPath: string, size: "w185" | "w342" | "w500" = "w185") {
  return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`;
}

export function releaseYear(releaseDate: string): string | null {
  return releaseDate ? releaseDate.slice(0, 4) : null;
}
