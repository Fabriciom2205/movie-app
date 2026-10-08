"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { EyeOff, ThumbsDown, ThumbsUp } from "lucide-react";
import { setRating, type Verdict } from "@/app/movie/[id]/actions";

export type RateMovie = { id: number; title: string; year: string | null; posterUrl: string | null };

export function RateGrid({ movies, moreUrl }: { movies: RateMovie[]; moreUrl: string | null }) {
  // A rated movie disappears at once; the server's refreshed list (without
  // it) takes over when the save finishes, or it comes back if the save fails.
  const [shown, removeShown] = useOptimistic(movies, (state, id: number) => state.filter((m) => m.id !== id));
  // "Haven't seen" is only remembered on this screen; nothing is saved.
  const [skipped, setSkipped] = useState(() => new Set<number>());
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function rate(movie: RateMovie, verdict: Verdict) {
    setError(null);
    startTransition(async () => {
      removeShown(movie.id);
      const result = await setRating(movie.id, verdict);
      if (result.error) setError(`${movie.title}: ${result.error}`);
    });
  }

  function skip(movie: RateMovie) {
    setSkipped((prev) => new Set(prev).add(movie.id));
  }

  const visible = shown.filter((m) => !skipped.has(m.id));

  return (
    <>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="mt-8 text-zinc-600 dark:text-zinc-400">That&rsquo;s all of these.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
          {visible.map((movie) => (
            <li key={movie.id} className="flex flex-col">
              {movie.posterUrl ? (
                <Image
                  src={movie.posterUrl}
                  alt=""
                  width={185}
                  height={278}
                  className="aspect-[2/3] h-auto w-full rounded-lg object-cover"
                />
              ) : (
                <div className="aspect-[2/3] w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              )}
              <p className="mt-2 font-medium leading-tight">
                {movie.title}
                {movie.year && <span className="font-normal text-zinc-500"> ({movie.year})</span>}
              </p>
              <div className="mt-2 flex flex-col gap-1.5" role="group" aria-label={`Rate ${movie.title}`}>
                <button type="button" onClick={() => rate(movie, "up")} className={buttonClass}>
                  <ThumbsUp aria-hidden="true" className="h-4 w-4" />
                  Liked it
                </button>
                <button type="button" onClick={() => rate(movie, "down")} className={buttonClass}>
                  <ThumbsDown aria-hidden="true" className="h-4 w-4" />
                  Not for me
                </button>
                <button type="button" onClick={() => skip(movie)} className={`${buttonClass} text-zinc-500`}>
                  <EyeOff aria-hidden="true" className="h-4 w-4" />
                  Haven&rsquo;t seen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {moreUrl && (
        <div className="mt-10">
          <Link
            href={moreUrl}
            className="rounded-md border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Show more movies
          </Link>
        </div>
      )}
    </>
  );
}

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-900";
