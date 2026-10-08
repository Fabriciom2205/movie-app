"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleAlert, EyeOff, Film, PartyPopper, ThumbsDown, ThumbsUp } from "lucide-react";
import { setRating, type Verdict } from "@/app/movie/[id]/actions";
import { banner, card, quietButton, secondaryButton } from "@/app/ui";

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
        <p role="alert" className={`mt-4 ${banner} bg-danger-soft text-on-danger-soft`}>
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <div className={`mt-6 ${card}`}>
          <div className="mb-3 grid size-11 place-items-center rounded-full bg-soft text-on-soft">
            <PartyPopper aria-hidden="true" className="size-5" />
          </div>
          <p className="font-semibold">That&rsquo;s all of these</p>
          <p className="mt-1 text-ink-muted">
            {moreUrl ? "Load the next batch, or head home for a recommendation." : "Head home for a recommendation."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {visible.map((movie) => (
            <li key={movie.id} className="flex flex-col rounded-card border-2 border-line bg-card p-2.5">
              {movie.posterUrl ? (
                <Image
                  src={movie.posterUrl}
                  alt=""
                  width={185}
                  height={278}
                  className="aspect-2/3 h-auto w-full rounded-poster object-cover"
                />
              ) : (
                <div className="grid aspect-2/3 w-full place-items-center rounded-poster bg-soft text-on-soft">
                  <Film aria-hidden="true" className="size-8" />
                </div>
              )}
              <p className="mt-2.5 px-1 font-heading leading-snug font-medium">
                {movie.title}
                {movie.year && <span className="font-normal text-ink-muted"> ({movie.year})</span>}
              </p>
              {/* mt-auto: the buttons line up at the bottom of each row of cards. */}
              <div role="group" aria-label={`Rate ${movie.title}`} className="mt-auto grid grid-cols-2 gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => rate(movie, "up")}
                  aria-label="Liked it"
                  title="Liked it"
                  className={`${thumbButton} hover:border-on-mint hover:bg-mint hover:text-on-mint active:border-on-mint active:bg-mint active:text-on-mint`}
                >
                  <ThumbsUp aria-hidden="true" className="size-5" strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={() => rate(movie, "down")}
                  aria-label="Not for me"
                  title="Not for me"
                  className={`${thumbButton} hover:border-on-peach hover:bg-peach hover:text-on-peach active:border-on-peach active:bg-peach active:text-on-peach`}
                >
                  <ThumbsDown aria-hidden="true" className="size-5" strokeWidth={2.25} />
                </button>
                <button type="button" onClick={() => skip(movie)} className={`col-span-2 ${quietButton}`}>
                  <EyeOff aria-hidden="true" className="size-4" />
                  Haven&rsquo;t seen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {moreUrl && (
        <div className="mt-8 flex justify-center">
          <Link href={moreUrl} className={secondaryButton}>
            Show more movies
          </Link>
        </div>
      )}
    </>
  );
}

// Round icon buttons: on a phone a card is ~145px wide, too narrow for two
// labeled pills side by side. The label is the aria-label (and a tooltip); the
// page's intro explains the thumbs. They take the meaning colors (liked = mint,
// not for me = peach) on hover and while pressed.
const thumbButton =
  "inline-flex h-10 items-center justify-center rounded-full border-2 border-line bg-card text-ink transition-colors duration-150 ease-out motion-safe:active:translate-y-px";
