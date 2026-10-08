import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, Sparkles, Star, ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import { ListToggles } from "@/app/movie/[id]/list-toggles";
import { getMyLists } from "@/lib/my-movie";
import { recommendMovie, type Person, type RecommendRequest, type ReasonLine } from "@/lib/recommender";
import { createClient } from "@/lib/supabase/server";
import { formatRuntime, releaseYear, tmdbImageUrl } from "@/lib/tmdb";
import { PickRating } from "./pick-rating";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_GENRES = 10;
const MAX_SKIP = 100;

const REASON_ICONS: Record<ReasonLine["kind"], LucideIcon> = {
  friendsLiked: ThumbsUp,
  becauseYouLiked: Sparkles,
  onList: Bookmark,
  wellRated: Star,
};

// /pick?watch=<user id>&watch=<user id>&genre=35&genre=53&skip=603,550&seed=48213
// (proxy.ts adds a seed when there isn't one)
export default async function PickPage(props: PageProps<"/pick">) {
  const req = parseRequest(await props.searchParams);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect("/login");

  const result = await recommendMovie(userId, req);
  const { pick } = result;
  // For the list pills: your lists, and which already have this movie.
  const myLists = pick ? await getMyLists(pick.movie.id) : [];
  const forWhom =
    result.watchers.length > 1 ? `for ${joinNames(result.watchers.map((w) => (w.isMe ? "you" : w.name)))}` : "";
  const anotherUrl = pickUrl({ ...req, skip: result.nextSkip });
  // No seed: proxy.ts gives "Start over" a fresh one, so it's a new shuffle.
  const startOverUrl = req.skip.length > 0 ? pickUrl({ ...req, skip: [], seed: null }) : null;
  const changeUrl = pickUrl({ ...req, skip: [], seed: null }).replace("/pick", "/"); // same choices, on the home form

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href={changeUrl} className="text-sm text-ink-muted hover:underline">
        ← Change what you&rsquo;re in the mood for
      </Link>

      <p className="mt-6 text-sm font-medium text-ink-muted">Tonight&rsquo;s pick {forWhom}</p>

      {pick ? (
        <div className="mt-3 flex flex-col gap-6 sm:flex-row">
          {/* Poster and title open the full movie page (rent/buy options and more). */}
          <Link href={`/movie/${pick.movie.id}`} className="shrink-0 self-start" tabIndex={-1} aria-hidden="true">
            {pick.movie.poster_path ? (
              <Image
                src={tmdbImageUrl(pick.movie.poster_path, "w342")}
                alt=""
                width={200}
                height={300}
                preload
                className="h-[300px] w-[200px] rounded-lg object-cover transition-opacity hover:opacity-90"
              />
            ) : (
              <div className="h-[300px] w-[200px] rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            )}
          </Link>

          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">
              <Link href={`/movie/${pick.movie.id}`} className="hover:underline">
                {pick.movie.title}
              </Link>
              {pick.movie.release_date && (
                <span className="ml-2 font-normal text-ink-muted">({releaseYear(pick.movie.release_date)})</span>
              )}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {[formatRuntime(pick.movie.runtime), pick.movie.genres.map((g) => g.name).join(", ")]
                .filter(Boolean)
                .join(" · ")}
            </p>

            {(pick.reasons.length > 0 || pick.dislikedBy.length > 0) && (
              <ul className="mt-4 flex flex-col gap-1.5">
                {pick.reasons.slice(0, 3).map((reason) => {
                  const Icon = REASON_ICONS[reason.kind];
                  return (
                    <li key={reason.kind} className="flex items-start gap-2 font-medium">
                      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                      {reason.text}
                    </li>
                  );
                })}
                {pick.dislikedBy.map((name) => (
                  <li key={name} className="flex items-start gap-2 text-ink-muted">
                    <ThumbsDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    {name} wasn&rsquo;t into it
                  </li>
                ))}
              </ul>
            )}

            {pick.movie.overview && (
              <p className="mt-4 line-clamp-4 leading-7 text-zinc-700 dark:text-zinc-300">{pick.movie.overview}</p>
            )}

            <div className="mt-5">
              <p className="text-sm font-medium text-ink-muted">Stream it on</p>
              <ul className="mt-2 flex flex-wrap gap-3">
                {pick.services.map((s) => (
                  <li key={s.provider_id} className="flex items-center gap-2">
                    <Image
                      src={tmdbImageUrl(s.logo_path, "w92")}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-md"
                    />
                    <span className="text-sm">{s.provider_name}</span>
                  </li>
                ))}
              </ul>
            </div>

            {result.watchersWithoutServices.length > 0 && (
              <ServicesHint missing={result.watchersWithoutServices} watchers={result.watchers} />
            )}

            <PickRating movieId={pick.movie.id} title={pick.movie.title} />
            <ListToggles movieId={pick.movie.id} lists={myLists} />

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {result.moreLeft ? (
                <Link href={anotherUrl} className="rounded-md bg-foreground px-4 py-2 font-medium text-background">
                  Pick another
                </Link>
              ) : (
                startOverUrl && (
                  <Link href={startOverUrl} className="rounded-md bg-foreground px-4 py-2 font-medium text-background">
                    Start over
                  </Link>
                )
              )}
            </div>
            {!result.moreLeft && (
              <p className="mt-3 text-sm text-ink-muted">That&rsquo;s the last one we found for tonight.</p>
            )}
          </div>
        </div>
      ) : (
        <NothingFound
          problem={result.problem}
          watchersWithoutServices={result.watchersWithoutServices}
          moreUrl={result.moreLeft ? anotherUrl : null}
          startOverUrl={startOverUrl}
          changeUrl={changeUrl}
        />
      )}

      {/* Required attribution: TMDB's availability data comes from JustWatch. */}
      <p className="mt-12 text-xs text-ink-muted">Availability data provided by JustWatch.</p>
    </main>
  );
}

// When someone watching hasn't picked services, the pick only uses the
// others' services. Say so, so a "why can't I watch this?" doesn't surprise.
function ServicesHint({ missing, watchers }: { missing: Person[]; watchers: Person[] }) {
  const missingIds = new Set(missing.map((p) => p.id));
  const subject = joinNames(missing.map((p) => (p.isMe ? "you" : p.name)));
  const verb = missing.length === 1 && !missing[0].isMe ? "hasn't" : "haven't";
  const basis = joinNames(
    watchers.filter((w) => !missingIds.has(w.id)).map((w) => (w.isMe ? "your" : `${w.name}'s`)),
  );
  const includesMe = missing.some((p) => p.isMe);

  return (
    <p className="mt-4 text-sm text-ink-muted">
      {subject.charAt(0).toUpperCase() + subject.slice(1)} {verb} picked streaming services yet, so this pick
      only uses {basis} services.
      {includesMe && (
        <>
          {" "}
          <Link href="/settings" className="underline">
            Add yours in Settings
          </Link>
          .
        </>
      )}
    </p>
  );
}

function NothingFound({
  problem,
  watchersWithoutServices,
  moreUrl,
  startOverUrl,
  changeUrl,
}: {
  problem: "noServices" | "nothingFound" | null;
  watchersWithoutServices: Person[];
  moreUrl: string | null;
  startOverUrl: string | null;
  changeUrl: string;
}) {
  const primary = "rounded-md bg-foreground px-4 py-2 font-medium text-background";
  const secondary =
    "rounded-md border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

  if (problem === "noServices") {
    return (
      <div className="mt-3">
        <h1 className="text-2xl font-semibold">Pick your streaming services first</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Recommendations only include movies you can stream tonight, so they need to know what you pay for.
          {watchersWithoutServices.length > 1 &&
            ` Nobody watching has picked any yet (${joinNames(watchersWithoutServices.map((p) => (p.isMe ? "you" : p.name)))}).`}
        </p>
        <div className="mt-6">
          <Link href="/settings" className={primary}>
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <h1 className="text-2xl font-semibold">
        {startOverUrl ? "That's everything we found for tonight" : "Couldn't find anything right now"}
      </h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        {moreUrl
          ? "None of the best matches are streaming on your services at the moment."
          : "Try other moods, or no mood at all."}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {moreUrl && (
          <Link href={moreUrl} className={primary}>
            Keep looking
          </Link>
        )}
        {startOverUrl && (
          <Link href={startOverUrl} className={moreUrl ? secondary : primary}>
            Start over
          </Link>
        )}
        <Link href={changeUrl} className={secondary}>
          Change moods
        </Link>
      </div>
    </div>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

// Anything malformed in the URL is dropped; nothing here is trusted.
function parseRequest(params: SearchParams): RecommendRequest {
  const all = (key: string) => ([] as string[]).concat(params[key] ?? []);
  const positiveInts = (values: string[]) => values.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0);

  return {
    watcherIds: all("watch").filter((id) => UUID.test(id)),
    genreIds: [...new Set(positiveInts(all("genre")))].slice(0, MAX_GENRES),
    skip: positiveInts(typeof params.skip === "string" ? params.skip.split(",") : []).slice(-MAX_SKIP),
    seed: positiveInts(all("seed"))[0] ?? 1, // proxy.ts makes sure there is one
  };
}

function pickUrl(req: Omit<RecommendRequest, "seed"> & { seed: number | null }): string {
  const params = new URLSearchParams();
  for (const id of req.watcherIds) params.append("watch", id);
  for (const id of req.genreIds) params.append("genre", String(id));
  if (req.skip.length) params.set("skip", req.skip.join(","));
  if (req.seed !== null) params.set("seed", String(req.seed));
  const query = params.toString();
  return query ? `/pick?${query}` : "/pick";
}

// ["you"] -> "you", ["you", "Alex"] -> "you and Alex"
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
