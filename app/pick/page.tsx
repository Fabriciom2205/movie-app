import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { pickMovie, type PickRequest, type PickResult } from "@/lib/picker";
import { isTimeLimit } from "@/lib/picker-options";
import { createClient } from "@/lib/supabase/server";
import { formatRuntime, releaseYear, tmdbImageUrl } from "@/lib/tmdb";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SKIP = 100;

// /pick?list=<id>&watch=<user id>&watch=<user id>&time=120&skip=603,550
export default async function PickPage(props: PageProps<"/pick">) {
  const req = parseRequest(await props.searchParams);
  if (!req) redirect("/");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect("/login");

  const result = await pickMovie(userId, req);
  if (!result) notFound(); // not a list you're on

  const { pick } = result;
  const startOver = pickUrl({ ...req, skip: [] });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Change what you&rsquo;re looking for
      </Link>

      <p className="mt-6 text-sm font-medium text-zinc-500">Tonight, from {result.listName}</p>

      {pick ? (
        <div className="mt-3 flex flex-col gap-6 sm:flex-row">
          {pick.posterPath ? (
            <Image
              src={tmdbImageUrl(pick.posterPath, "w342")}
              alt={`${pick.title} poster`}
              width={200}
              height={300}
              preload
              className="h-[300px] w-[200px] shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="h-[300px] w-[200px] shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          )}

          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">
              {pick.title}
              {pick.releaseDate && (
                <span className="ml-2 font-normal text-zinc-500">
                  ({releaseYear(pick.releaseDate)})
                </span>
              )}
            </h1>
            {pick.runtime && <p className="mt-2 text-zinc-500">{formatRuntime(pick.runtime)}</p>}

            <div className="mt-5">
              <p className="text-sm font-medium text-zinc-500">Stream it on</p>
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

            {(pick.likedBy.length > 0 || pick.dislikedBy.length > 0) && (
              <ul className="mt-5 flex flex-col gap-1 text-sm">
                {pick.likedBy.map((name) => (
                  <li key={`up-${name}`} className="flex items-center gap-2">
                    <ThumbsUp aria-hidden="true" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {name} liked it
                  </li>
                ))}
                {pick.dislikedBy.map((name) => (
                  <li key={`down-${name}`} className="flex items-center gap-2 text-zinc-500">
                    <ThumbsDown aria-hidden="true" className="h-4 w-4" />
                    {name} wasn&rsquo;t into it
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {result.othersLeft > 0 ? (
                <Link
                  href={pickUrl({ ...req, skip: [...req.skip, pick.id] })}
                  className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
                >
                  Pick another
                </Link>
              ) : (
                req.skip.length > 0 && (
                  <Link
                    href={startOver}
                    className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
                  >
                    Start over
                  </Link>
                )
              )}
              <Link
                href={`/movie/${pick.id}`}
                className="rounded-md border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Movie details
              </Link>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              {result.othersLeft === 0
                ? req.skip.length > 0
                  ? "That's the last one. Start over to go through them again."
                  : "This is the only one that fits."
                : result.othersLeft === 1
                  ? "1 other movie fits too."
                  : `${result.othersLeft} other movies fit too.`}
            </p>
          </div>
        </div>
      ) : (
        <NothingFits result={result} startOver={req.skip.length > 0 ? startOver : null} />
      )}

      {/* Required attribution: TMDB's availability data comes from JustWatch. */}
      <p className="mt-12 text-xs text-zinc-500">
        Availability data provided by JustWatch.
        {pick?.whereToWatchLink && (
          <>
            {" "}
            <a href={pick.whereToWatchLink} target="_blank" rel="noopener noreferrer" className="underline">
              See all options on TMDB
            </a>
          </>
        )}
      </p>
    </main>
  );
}

function NothingFits({ result, startOver }: { result: PickResult; startOver: string | null }) {
  const { counts } = result;
  const reasons = [
    [counts.seen, "already seen by someone watching"],
    [counts.tooLong, "too long, or of unknown length"],
    [counts.unavailable, "not streaming on your services right now"],
  ] as const;

  return (
    <div className="mt-3">
      <h1 className="text-2xl font-semibold">
        {startOver ? "That's everything that fits tonight" : "Nothing on this list fits tonight"}
      </h1>

      {counts.total === 0 ? (
        <p className="mt-3 text-zinc-500">
          This list is empty. Add movies to it from their pages.
        </p>
      ) : (
        !startOver && (
          <ul className="mt-3 list-disc pl-5 text-zinc-600 dark:text-zinc-400">
            {reasons
              .filter(([n]) => n > 0)
              .map(([n, why]) => (
                <li key={why}>
                  {n === 1 ? "1 movie" : `${n} movies`} {why}
                </li>
              ))}
          </ul>
        )
      )}

      {result.watchersWithoutServices.length > 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          No streaming services picked yet for {result.watchersWithoutServices.join(", ")}. Each person
          sets theirs in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>
          .
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {startOver && (
          <Link href={startOver} className="rounded-md bg-foreground px-4 py-2 font-medium text-background">
            Start over
          </Link>
        )}
        <Link
          href="/"
          className="rounded-md border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Try different choices
        </Link>
      </div>
    </div>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

// Returns null when there's no usable list id. Everything else falls back to a default.
function parseRequest(params: SearchParams): PickRequest | null {
  const listId = typeof params.list === "string" ? params.list : "";
  if (!UUID.test(listId)) return null;

  const watch = ([] as string[]).concat(params.watch ?? []).filter((id) => UUID.test(id));
  const time = Number(params.time);
  const skip = (typeof params.skip === "string" ? params.skip.split(",") : [])
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .slice(0, MAX_SKIP);

  return {
    listId,
    watcherIds: watch, // empty = everyone on the list
    maxMinutes: isTimeLimit(time) ? time : null,
    skip,
  };
}

function pickUrl(req: PickRequest): string {
  const params = new URLSearchParams({ list: req.listId });
  for (const id of req.watcherIds) params.append("watch", id);
  if (req.maxMinutes) params.set("time", String(req.maxMinutes));
  if (req.skip.length) params.set("skip", req.skip.join(","));
  return `/pick?${params}`;
}
