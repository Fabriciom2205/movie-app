import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Film, Tv } from "lucide-react";
import { Perforation, TicketFields } from "@/app/ticket";
import { card, pagePanel, posterGrid, providerTag, quietButton, sectionLabel } from "@/app/ui";
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
  const free = dedupe([...(providers?.free ?? []), ...(providers?.ads ?? [])]);
  const rows = [
    { label: "Stream", providers: providers?.flatrate },
    { label: "Free", providers: free },
    { label: "Rent", providers: providers?.rent },
    { label: "Buy", providers: providers?.buy },
  ].filter((row): row is { label: string; providers: WatchProvider[] } => !!row.providers?.length);

  return (
    <main id="content" className={`${pagePanel} max-w-3xl`}>
      {/* Home, not "back": you can get here from search, /pick or a list. */}
      <Link href="/" className={`${quietButton} -ml-2`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Home
      </Link>

      <article className="mt-4 bg-ticket shadow-soft">
        {/* The band, as on /pick; TMDB's number for the movie is the
            ticket's serial number. */}
        <div className="flex items-baseline justify-between gap-4 bg-primary px-5 pt-2.5 pb-2 leading-none text-on-primary sm:px-6">
          <span className="font-heading text-3xl leading-none tracking-wide uppercase">Feature presentation</span>
          <span className="text-[11px] font-medium tracking-widest uppercase">No. {movie.id}</span>
        </div>

        <div className={`${posterGrid} px-5 pt-5 sm:px-6 sm:pt-6`}>
          {movie.poster_path ? (
            <Image
              src={tmdbImageUrl(movie.poster_path, "w342")}
              alt={`${movie.title} poster`}
              width={200}
              height={300}
              preload // it's the biggest thing on the page, so load it first
              className="aspect-2/3 w-full self-start object-cover outline-2 outline-ink sm:row-span-2"
            />
          ) : (
            <div className="grid aspect-2/3 w-full place-items-center self-start bg-soft text-on-soft outline-2 outline-ink sm:row-span-2">
              <Film aria-hidden="true" className="size-8" />
            </div>
          )}

          <div className="min-w-0 self-end sm:self-start">
            <h1 className="text-4xl break-words sm:text-6xl">{movie.title}</h1>
            {year && <p className="mt-2 text-sm">({year})</p>}
          </div>

          {/* Under the poster on phones (the column beside it is too narrow),
              beside it wider up. */}
          <div className="col-span-2 flex min-w-0 flex-col gap-5 sm:col-span-1 sm:col-start-2">
            <TicketFields
              fields={[
                { label: "Released", value: formatDate(movie.release_date) },
                { label: "Runtime", value: formatRuntime(movie.runtime) },
                { label: "Rated", value: movie.vote_count > 0 ? `${movie.vote_average.toFixed(1)} / 10` : null },
                { label: "Genre", wide: true, value: movie.genres.map((g) => g.name).join(", ") || null },
              ]}
            />
            {movie.tagline && <p className="font-medium">&ldquo;{movie.tagline}&rdquo;</p>}
            {movie.overview && <p className="text-[13px] leading-relaxed">{movie.overview}</p>}
          </div>
        </div>

        <Perforation className="mt-6" />

        {/* The stub: your rating and your lists. */}
        <div className="grid gap-6 px-5 pt-5 pb-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
          <RatingButtons movieId={movie.id} verdict={myVerdict} />
          <ListToggles movieId={movie.id} lists={myLists} />
        </div>
      </article>

      {/* A second ticket: where it's on, one row per way of watching. */}
      <section aria-labelledby="where-to-watch" className={`mt-6 ${card}`}>
        <h2 id="where-to-watch" className="text-3xl">
          Where to watch in the US
        </h2>

        {rows.length > 0 ? (
          <dl className="mt-4 border-t-2 border-ink">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid gap-2 border-b border-ink/35 py-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:items-center"
              >
                <dt className={sectionLabel}>{row.label}</dt>
                <dd>
                  <ProviderList providers={row.providers} />
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 flex items-start gap-2.5">
            <Tv aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            Not available to stream, rent, or buy in the US right now.
          </p>
        )}

        {/* Required attribution: TMDB's availability data comes from JustWatch. */}
        <p className="mt-5 text-xs text-ink-muted">
          Availability data provided by JustWatch.
          {providers?.link && (
            <>
              {" "}
              <a
                href={providers.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-on-soft underline underline-offset-2"
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

// Logo + name (on a phone you can't hover a bare logo to learn its name).
function ProviderList({ providers }: { providers: WatchProvider[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {providers.map((p) => (
        <li key={p.provider_id} className={providerTag}>
          <Image src={tmdbImageUrl(p.logo_path, "w92")} alt="" width={28} height={28} className="size-7 rounded-full" />
          {p.provider_name}
        </li>
      ))}
    </ul>
  );
}

// "2015-09-30" -> "Sep 30, 2015". A date with no time is midnight UTC, so it's
// formatted in UTC too (in New York it would otherwise show Sep 29).
function formatDate(date: string): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

// "free" and "ads" can list the same service; keep the first of each.
function dedupe(providers: WatchProvider[]): WatchProvider[] {
  const seen = new Set<number>();
  return providers.filter((p) => !seen.has(p.provider_id) && seen.add(p.provider_id));
}
