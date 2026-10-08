import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Film, Tv } from "lucide-react";
import { card, posterGrid, providerTag, quietButton, sectionLabel } from "@/app/ui";
import {
  formatRuntime,
  getMovie,
  getWatchProviders,
  releaseYear,
  tmdbImageUrl,
  type WatchProvider,
} from "@/lib/tmdb";
import { getMyLists, getMyVerdict } from "@/lib/my-movie";
import { ListToggles } from "./list-toggles";
import { RatingButtons } from "./rating-buttons";

export default async function MoviePage(props: PageProps<"/movie/[id]">) {
  const { id } = await props.params;
  if (!/^\d+$/.test(id)) notFound();
  const movieId = Number(id);

  // Start all requests at once rather than one after the other.
  const [movie, providers, myVerdict, myLists] = await Promise.all([
    getMovie(movieId),
    getWatchProviders(movieId, "US"),
    getMyVerdict(movieId),
    getMyLists(movieId),
  ]);
  if (!movie) notFound();

  const year = releaseYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const free = dedupe([...(providers?.free ?? []), ...(providers?.ads ?? [])]);
  const hasAny =
    !!providers &&
    [providers.flatrate, free, providers.rent, providers.buy].some((list) => list?.length);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      {/* Home, not "back": you can get here from search, /pick or a list. */}
      <Link href="/" className={`${quietButton} -ml-3`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Home
      </Link>

      <article className={`mt-4 shadow-soft ${card} ${posterGrid}`}>
        {movie.poster_path ? (
          <Image
            src={tmdbImageUrl(movie.poster_path, "w342")}
            alt={`${movie.title} poster`}
            width={200}
            height={300}
            preload // it's the biggest thing on the page, so load it first
            className="aspect-2/3 w-full self-start rounded-poster object-cover sm:row-span-2"
          />
        ) : (
          <div className="grid aspect-2/3 w-full place-items-center self-start rounded-poster bg-soft text-on-soft sm:row-span-2">
            <Film aria-hidden="true" className="size-8" />
          </div>
        )}

        <div className="min-w-0 self-center sm:self-start">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {movie.title}
            {/* A real space (not a margin), so the year can wrap to the next line. */}
            {year && <> <span className="font-normal text-ink-muted">({year})</span></>}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {[runtime, movie.genres.map((g) => g.name).join(", ")]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {/* The tagline sits under the poster on phones: too long for the narrow
            column beside it. */}
        <div className="col-span-2 flex min-w-0 flex-col gap-4 sm:col-span-1 sm:col-start-2">
          {movie.tagline && <p className="font-semibold text-ink-muted italic">{movie.tagline}</p>}
          {movie.overview && <p className="leading-relaxed">{movie.overview}</p>}
        </div>

        {/* Your actions, under a divider (as on /pick). */}
        <div className="col-span-2 grid gap-5 border-t-2 border-line pt-5 sm:grid-cols-2 sm:gap-6">
          <RatingButtons movieId={movie.id} verdict={myVerdict} />
          <ListToggles movieId={movie.id} lists={myLists} />
        </div>
      </article>

      <section className={`mt-6 ${card}`}>
        <h2 className="text-xl font-semibold tracking-tight">Where to watch in the US</h2>

        {hasAny ? (
          <div className="mt-4 flex flex-col gap-5">
            <ProviderRow label="Stream" providers={providers?.flatrate} />
            <ProviderRow label="Free" providers={free} />
            <ProviderRow label="Rent" providers={providers?.rent} />
            <ProviderRow label="Buy" providers={providers?.buy} />
          </div>
        ) : (
          <p className="mt-3 flex items-start gap-2.5 text-ink-muted">
            <Tv aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            Not available to stream, rent, or buy in the US right now.
          </p>
        )}

        {/* Required attribution: TMDB's availability data comes from JustWatch. */}
        <p className="mt-6 text-xs text-ink-muted">
          Availability data provided by JustWatch.
          {providers?.link && (
            <>
              {" "}
              <a
                href={providers.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-on-soft underline underline-offset-2"
              >
                See all options on TMDB
                <ExternalLink aria-hidden="true" className="size-3" />
                <span className="sr-only">(opens in a new tab)</span>
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
      <h3 className={`mb-2 ${sectionLabel}`}>{label}</h3>
      <ul className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <li key={p.provider_id} className={providerTag}>
            <Image
              src={tmdbImageUrl(p.logo_path, "w92")}
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-full"
            />
            {p.provider_name}
          </li>
        ))}
      </ul>
    </div>
  );
}

// "free" and "ads" can list the same service; keep the first of each.
function dedupe(providers: WatchProvider[]): WatchProvider[] {
  const seen = new Set<number>();
  return providers.filter((p) => !seen.has(p.provider_id) && seen.add(p.provider_id));
}
