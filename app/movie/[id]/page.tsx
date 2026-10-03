import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatRuntime,
  getMovie,
  getWatchProviders,
  releaseYear,
  tmdbImageUrl,
  type WatchProvider,
} from "@/lib/tmdb";
import type { Verdict } from "./actions";
import { RatingButtons } from "./rating-buttons";

export default async function MoviePage(props: PageProps<"/movie/[id]">) {
  const { id } = await props.params;
  if (!/^\d+$/.test(id)) notFound();
  const movieId = Number(id);

  // Start all requests at once rather than one after the other.
  const [movie, providers, myVerdict] = await Promise.all([
    getMovie(movieId),
    getWatchProviders(movieId, "US"),
    getMyVerdict(movieId),
  ]);
  if (!movie) notFound();

  const year = releaseYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const free = dedupe([...(providers?.free ?? []), ...(providers?.ads ?? [])]);
  const hasAny =
    !!providers &&
    [providers.flatrate, free, providers.rent, providers.buy].some((list) => list?.length);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Search
      </Link>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row">
        {movie.poster_path ? (
          <Image
            src={tmdbImageUrl(movie.poster_path, "w342")}
            alt={`${movie.title} poster`}
            width={200}
            height={300}
            preload // it's the biggest thing on the page, so load it first
            className="h-[300px] w-[200px] shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="h-[300px] w-[200px] shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        )}

        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">
            {movie.title}
            {year && <span className="ml-2 font-normal text-zinc-500">({year})</span>}
          </h1>
          {movie.tagline && <p className="mt-1 italic text-zinc-500">{movie.tagline}</p>}

          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {[runtime, movie.genres.map((g) => g.name).join(", ")]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {movie.overview && <p className="mt-4 leading-7">{movie.overview}</p>}

          <RatingButtons movieId={movie.id} verdict={myVerdict} />
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Where to watch in the US</h2>

        {hasAny ? (
          <div className="flex flex-col gap-5">
            <ProviderRow label="Stream" providers={providers?.flatrate} />
            <ProviderRow label="Free" providers={free} />
            <ProviderRow label="Rent" providers={providers?.rent} />
            <ProviderRow label="Buy" providers={providers?.buy} />
          </div>
        ) : (
          <p className="text-zinc-500">
            Not available to stream, rent, or buy in the US right now.
          </p>
        )}

        {/* Required attribution: TMDB's availability data comes from JustWatch. */}
        <p className="mt-6 text-xs text-zinc-500">
          Availability data provided by JustWatch.
          {providers?.link && (
            <>
              {" "}
              <a href={providers.link} target="_blank" rel="noopener noreferrer" className="underline">
                See all options on TMDB
              </a>
            </>
          )}
        </p>
      </section>
    </main>
  );
}

function ProviderRow({ label, providers }: { label: string; providers?: WatchProvider[] }) {
  if (!providers?.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-zinc-500">{label}</h3>
      <ul className="flex flex-wrap gap-3">
        {providers.map((p) => (
          <li key={p.provider_id} title={p.provider_name}>
            <Image
              src={tmdbImageUrl(p.logo_path, "w92")}
              alt={p.provider_name}
              width={44}
              height={44}
              className="h-11 w-11 rounded-lg"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// The signed-in user's own rating. Filter by user_id: list-mates' ratings are
// readable too, so "any rating for this movie" could be someone else's.
async function getMyVerdict(movieId: number): Promise<Verdict | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("ratings")
    .select("verdict")
    .eq("user_id", userId)
    .eq("movie_id", movieId)
    .maybeSingle();
  return (data?.verdict as Verdict | undefined) ?? null;
}

// "free" and "ads" can list the same service; keep the first of each.
function dedupe(providers: WatchProvider[]): WatchProvider[] {
  const seen = new Set<number>();
  return providers.filter((p) => !seen.has(p.provider_id) && seen.add(p.provider_id));
}
