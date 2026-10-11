import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Film, Info, SearchX, Shuffle, Tv, type LucideIcon } from "lucide-react";
import { ListToggles } from "@/app/movie/[id]/list-toggles";
import { Perforation, TicketFields } from "@/app/ticket";
import { TicketDate } from "@/app/ticket-date";
import { banner, card, pagePanel, posterGrid, primaryButton, quietButton, secondaryButton, sectionLabel } from "@/app/ui";
import { getMyLists } from "@/lib/my-movie";
import { recommendMovie, type Person, type RecommendRequest } from "@/lib/recommender";
import { createClient } from "@/lib/supabase/server";
import { formatRuntime, releaseYear, tmdbImageUrl } from "@/lib/tmdb";
import { PickRating } from "./pick-rating";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_GENRES = 10;
const MAX_SKIP = 100;

// "Admit one", "Admit two"... on the ticket's band.
const COUNT_WORDS = ["", "one", "two", "three", "four", "five", "six"];

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
  // For the list toggles: your lists, and which already have this movie.
  const myLists = pick ? await getMyLists(pick.movie.id) : [];
  const forWhom =
    result.watchers.length > 1 ? `for ${joinNames(result.watchers.map((w) => (w.isMe ? "you" : w.name)))}` : "";
  const anotherUrl = pickUrl({ ...req, skip: result.nextSkip });
  // No seed: proxy.ts gives "Start over" a fresh one, so it's a new shuffle.
  const startOverUrl = req.skip.length > 0 ? pickUrl({ ...req, skip: [], seed: null }) : null;
  const changeUrl = pickUrl({ ...req, skip: [], seed: null }).replace("/pick", "/"); // same choices, on the home form

  return (
    <main id="content" className={`${pagePanel} max-w-3xl`}>
      <Link href={changeUrl} className={`${quietButton} -ml-2`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Change what you&rsquo;re in the mood for
      </Link>

      {pick ? (
        <article className="mt-4 bg-ticket shadow-soft">
          {/* The band: how many it admits, and when. */}
          <div className="flex items-baseline justify-between gap-4 bg-primary px-5 pt-2.5 pb-2 leading-none text-on-primary sm:px-6">
            <span className="font-heading text-3xl leading-none tracking-wide uppercase">
              Admit {COUNT_WORDS[result.watchers.length] ?? result.watchers.length}
            </span>
            <span className="text-[11px] font-medium tracking-widest uppercase">
              Tonight &middot; <TicketDate />
            </span>
          </div>

          <div className={`${posterGrid} px-5 pt-5 sm:px-6 sm:pt-6`}>
            {/* Poster and title open the full movie page (rent/buy options and more). */}
            <Link
              href={`/movie/${pick.movie.id}`}
              className="self-start outline-2 outline-ink sm:row-span-2"
              tabIndex={-1}
              aria-hidden="true"
            >
              {pick.movie.poster_path ? (
                <Image
                  src={tmdbImageUrl(pick.movie.poster_path, "w342")}
                  alt=""
                  width={200}
                  height={300}
                  preload
                  className="aspect-2/3 w-full object-cover transition-opacity duration-150 hover:opacity-90"
                />
              ) : (
                <div className="grid aspect-2/3 w-full place-items-center bg-soft text-on-soft">
                  <Film aria-hidden="true" className="size-8" />
                </div>
              )}
            </Link>

            <div className="min-w-0 self-end sm:self-start">
              <p className={sectionLabel}>Tonight&rsquo;s pick {forWhom}</p>
              <h1 className="mt-1.5 text-4xl break-words sm:text-6xl">
                <Link href={`/movie/${pick.movie.id}`} className="decoration-2 underline-offset-4 hover:underline">
                  {pick.movie.title}
                </Link>
              </h1>
              {pick.movie.release_date && (
                <p className="mt-2 text-sm">({releaseYear(pick.movie.release_date)})</p>
              )}
            </div>

            <div className="col-span-2 flex min-w-0 flex-col gap-5 sm:col-span-1 sm:col-start-2">
              <TicketFields
                fields={[
                  {
                    label: "Stream it on",
                    wide: true,
                    value: (
                      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {pick.services.map((s) => (
                          <li key={s.provider_id} className="flex items-center gap-2">
                            <Image
                              src={tmdbImageUrl(s.logo_path, "w92")}
                              alt=""
                              width={24}
                              height={24}
                              className="size-6 rounded-full"
                            />
                            {s.provider_name}
                          </li>
                        ))}
                      </ul>
                    ),
                  },
                  { label: "Runtime", value: formatRuntime(pick.movie.runtime) },
                  {
                    label: "Rated",
                    value: pick.movie.vote_count > 0 ? `${pick.movie.vote_average.toFixed(1)} / 10` : null,
                  },
                  { label: "Genre", wide: true, value: pick.movie.genres.map((g) => g.name).join(", ") || null },
                ]}
              />

              {/* The strongest reason is the ticket's rubber stamp; the rest
                  (and anyone who wasn't into it) go in the small print. */}
              {pick.reasons.length > 0 && (
                <p className="max-w-xs -rotate-3 self-center border-4 text-balance border-double border-stamp px-4 pt-2 pb-1.5 text-center font-heading text-2xl leading-tight tracking-wide text-stamp uppercase">
                  {pick.reasons[0].text}
                </p>
              )}
              {(pick.reasons.length > 1 || pick.dislikedBy.length > 0) && (
                <ul className="flex flex-col gap-1 text-xs font-medium tracking-wide uppercase">
                  {pick.reasons.slice(1, 3).map((reason) => (
                    <li key={reason.kind}>
                      <span aria-hidden="true">+ </span>
                      {reason.text}
                    </li>
                  ))}
                  {pick.dislikedBy.map((name) => (
                    <li key={name}>
                      <span aria-hidden="true">&minus; </span>
                      {name} wasn&rsquo;t into it
                    </li>
                  ))}
                </ul>
              )}

              {pick.movie.overview && <p className="line-clamp-4 text-[13px] leading-relaxed">{pick.movie.overview}</p>}

              {result.watchersWithoutServices.length > 0 && (
                <ServicesHint missing={result.watchersWithoutServices} watchers={result.watchers} />
              )}
            </div>
          </div>

          <Perforation className="mt-6" />

          {/* The stub: the main action, then rate it (a rating means you've
              seen it, so the next pick leaves it out) or save it for later. */}
          <div className="flex flex-col gap-6 px-5 pt-5 pb-5 sm:px-6 sm:pb-6">
            <div>
              {result.moreLeft ? (
                <Link href={anotherUrl} className={`${primaryButton} w-full`}>
                  <Shuffle aria-hidden="true" className="size-6" />
                  Pick another
                </Link>
              ) : (
                startOverUrl && (
                  <Link href={startOverUrl} className={`${primaryButton} w-full`}>
                    <Shuffle aria-hidden="true" className="size-6" />
                    Start over
                  </Link>
                )
              )}
              {!result.moreLeft && (
                <p className="mt-3 text-sm text-ink-muted">That&rsquo;s the last one we found for tonight.</p>
              )}
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <PickRating movieId={pick.movie.id} title={pick.movie.title} />
              <ListToggles movieId={pick.movie.id} lists={myLists} />
            </div>
          </div>
        </article>
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
            <Link href="/settings" className="font-medium underline underline-offset-2">
              Add yours in Settings
            </Link>
            .
          </>
        )}
      </span>
    </p>
  );
}

// No pick: a ticket that says why, with one clear way forward (the primary
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
        <h1 className="text-4xl">Pick your streaming services first</h1>
        <p className="mt-3 leading-relaxed">
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
      <h1 className="text-4xl">
        {startOverUrl ? "That’s everything we found for tonight" : "Couldn’t find anything right now"}
      </h1>
      <p className="mt-3 leading-relaxed">
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
        {/* The only way forward when there is nothing else to try: then it's the main button. */}
        <Link href={changeUrl} className={moreUrl || startOverUrl ? secondaryButton : primaryButton}>
          Change moods
        </Link>
      </div>
    </div>
  );
}

// The icon at the top of an empty ticket, in a square ink box.
function EmptyIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="mb-4 grid size-12 place-items-center border-2 border-ink">
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
