import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Film,
  Info,
  SearchX,
  Shuffle,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { ListToggles } from "@/app/movie/[id]/list-toggles";
import {
  banner,
  card,
  posterGrid,
  primaryButton,
  providerTag,
  quietButton,
  secondaryButton,
  sectionLabel,
  tag,
} from "@/app/ui";
import { getMyLists } from "@/lib/my-movie";
import { recommendMovie, type Person, type RecommendRequest, type ReasonLine } from "@/lib/recommender";
import { createClient } from "@/lib/supabase/server";
import { formatRuntime, releaseYear, tmdbImageUrl } from "@/lib/tmdb";
import { PickRating } from "./pick-rating";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_GENRES = 10;
const MAX_SKIP = 100;

// Each kind of reason has its own icon and pastel pair (MASTER.md "Reason chips").
const REASONS: Record<ReasonLine["kind"], { icon: LucideIcon; color: string }> = {
  friendsLiked: { icon: ThumbsUp, color: "bg-mint text-on-mint" },
  becauseYouLiked: { icon: Sparkles, color: "bg-lilac text-on-lilac" },
  onList: { icon: Bookmark, color: "bg-soft text-on-soft" },
  wellRated: { icon: Star, color: "bg-peach text-on-peach" },
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
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <Link href={changeUrl} className={`${quietButton} -ml-3`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Change what you&rsquo;re in the mood for
      </Link>

      {pick ? (
        <>
          <p className={`mt-4 ${sectionLabel}`}>Tonight&rsquo;s pick {forWhom}</p>
          <article className={`mt-3 shadow-soft ${card} ${posterGrid}`}>
            {/* Poster and title open the full movie page (rent/buy options and more). */}
            <Link href={`/movie/${pick.movie.id}`} className="self-start sm:row-span-2" tabIndex={-1} aria-hidden="true">
              {pick.movie.poster_path ? (
                <Image
                  src={tmdbImageUrl(pick.movie.poster_path, "w342")}
                  alt=""
                  width={200}
                  height={300}
                  preload
                  className="aspect-2/3 w-full rounded-poster object-cover transition-opacity duration-150 hover:opacity-90"
                />
              ) : (
                <div className="grid aspect-2/3 w-full place-items-center rounded-poster bg-soft text-on-soft">
                  <Film aria-hidden="true" className="size-8" />
                </div>
              )}
            </Link>

            <div className="min-w-0 self-center sm:self-start">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                <Link
                  href={`/movie/${pick.movie.id}`}
                  className="decoration-2 underline-offset-4 hover:underline"
                >
                  {pick.movie.title}
                </Link>
                {/* A real space (not a margin), so the year can wrap to the next line. */}
                {pick.movie.release_date && (
                  <> <span className="font-normal text-ink-muted">({releaseYear(pick.movie.release_date)})</span></>
                )}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                {[formatRuntime(pick.movie.runtime), pick.movie.genres.map((g) => g.name).join(", ")]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <div className="col-span-2 flex min-w-0 flex-col gap-5 sm:col-span-1 sm:col-start-2">
              {(pick.reasons.length > 0 || pick.dislikedBy.length > 0) && (
                <ul className="flex flex-wrap gap-2">
                  {pick.reasons.slice(0, 3).map((reason) => {
                    const { icon: Icon, color } = REASONS[reason.kind];
                    return (
                      <li key={reason.kind} className={`${tag} ${color}`}>
                        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                        {reason.text}
                      </li>
                    );
                  })}
                  {pick.dislikedBy.map((name) => (
                    <li key={name} className={`${tag} bg-peach text-on-peach`}>
                      <ThumbsDown aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      {name} wasn&rsquo;t into it
                    </li>
                  ))}
                </ul>
              )}

              {pick.movie.overview && <p className="line-clamp-4 leading-relaxed">{pick.movie.overview}</p>}

              <div>
                <p className={sectionLabel}>Stream it on</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {pick.services.map((s) => (
                    <li key={s.provider_id} className={providerTag}>
                      <Image
                        src={tmdbImageUrl(s.logo_path, "w92")}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 rounded-full"
                      />
                      {s.provider_name}
                    </li>
                  ))}
                </ul>
              </div>

              {result.watchersWithoutServices.length > 0 && (
                <ServicesHint missing={result.watchersWithoutServices} watchers={result.watchers} />
              )}

              <div>
                {result.moreLeft ? (
                  <Link href={anotherUrl} className={`${primaryButton} w-full sm:w-auto`}>
                    <Shuffle aria-hidden="true" className="size-5" />
                    Pick another
                  </Link>
                ) : (
                  startOverUrl && (
                    <Link href={startOverUrl} className={`${primaryButton} w-full sm:w-auto`}>
                      <Shuffle aria-hidden="true" className="size-5" />
                      Start over
                    </Link>
                  )
                )}
                {!result.moreLeft && (
                  <p className="mt-3 text-sm text-ink-muted">That&rsquo;s the last one we found for tonight.</p>
                )}
              </div>
            </div>

            {/* Secondary actions, under a divider: rate it (a rating means you've
                seen it, so the next pick leaves it out) or save it for later. */}
            <div className="col-span-2 grid gap-5 border-t-2 border-line pt-5 sm:grid-cols-2 sm:gap-6">
              <PickRating movieId={pick.movie.id} title={pick.movie.title} />
              <ListToggles movieId={pick.movie.id} lists={myLists} />
            </div>
          </article>
        </>
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
      <p className="mt-10 text-xs text-ink-muted">Availability data provided by JustWatch.</p>
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
    <p className={`${banner} bg-soft text-on-soft`}>
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        {subject.charAt(0).toUpperCase() + subject.slice(1)} {verb} picked streaming services yet, so this pick
        only uses {basis} services.
        {includesMe && (
          <>
            {" "}
            <Link href="/settings" className="font-bold underline underline-offset-2">
              Add yours in Settings
            </Link>
            .
          </>
        )}
      </span>
    </p>
  );
}

// No pick: a card that says why, with one clear way forward (the primary
// button) and the other options as secondary buttons.
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
  if (problem === "noServices") {
    return (
      <div className={`mt-4 shadow-soft ${card}`}>
        <EmptyIcon icon={Tv} />
        <h1 className="text-2xl font-semibold tracking-tight">Pick your streaming services first</h1>
        <p className="mt-2 leading-relaxed">
          Recommendations only include movies you can stream tonight, so they need to know what you pay for.
          {watchersWithoutServices.length > 1 &&
            ` Nobody watching has picked any yet (${joinNames(watchersWithoutServices.map((p) => (p.isMe ? "you" : p.name)))}).`}
        </p>
        <div className="mt-6">
          <Link href="/settings" className={primaryButton}>
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-4 shadow-soft ${card}`}>
      <EmptyIcon icon={SearchX} />
      <h1 className="text-2xl font-semibold tracking-tight">
        {startOverUrl ? "That’s everything we found for tonight" : "Couldn’t find anything right now"}
      </h1>
      <p className="mt-2 leading-relaxed">
        {moreUrl
          ? "None of the best matches are streaming on your services at the moment."
          : "Try other moods, or no mood at all."}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {moreUrl && (
          <Link href={moreUrl} className={primaryButton}>
            Keep looking
          </Link>
        )}
        {startOverUrl && (
          <Link href={startOverUrl} className={moreUrl ? secondaryButton : primaryButton}>
            Start over
          </Link>
        )}
        <Link href={changeUrl} className={secondaryButton}>
          Change moods
        </Link>
      </div>
    </div>
  );
}

function EmptyIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="mb-4 grid size-12 place-items-center rounded-full bg-soft text-on-soft">
      <Icon aria-hidden="true" className="size-6" />
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
