"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleAlert, EyeOff, Film, PartyPopper, ThumbsDown, ThumbsUp } from "lucide-react";
import { setRating, type Verdict } from "@/app/movie/[id]/actions";
import { Perforation } from "@/app/ticket";
import { banner, card, primaryButton, quietButton, secondaryButton } from "@/app/ui";

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
          <div className="mb-3 grid size-11 place-items-center border-2 border-ink">
            <PartyPopper aria-hidden="true" className="size-5" />
          </div>
          <p className="font-heading text-3xl leading-none tracking-wide uppercase">That&rsquo;s all of these</p>
          <p className="mt-2">
            {moreUrl ? "Load the next batch, or head home for a recommendation." : "Head home for a recommendation."}
          </p>
        </div>
      ) : (
        // Each movie is a small ticket: poster and title, then a tear line and
        // the stub with the buttons. gap-3 leaves room for the notches, which
        // stick out 8px on each side.
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {visible.map((movie) => (
            <li key={movie.id} className="flex flex-col bg-ticket">
              <div className="p-2.5 pb-0">
                {movie.posterUrl ? (
                  <Image
                    src={movie.posterUrl}
                    alt=""
                    width={185}
                    height={278}
                    className="aspect-2/3 h-auto w-full object-cover outline-2 outline-ink"
                  />
                ) : (
                  <div className="grid aspect-2/3 w-full place-items-center bg-soft text-on-soft outline-2 outline-ink">
                    <Film aria-hidden="true" className="size-8" />
                  </div>
                )}
                <p className="mt-3 px-0.5 font-heading text-xl leading-none tracking-wide uppercase">
                  {movie.title}
                  {movie.year && (
                    <span className="font-body text-xs tracking-normal text-ink-muted normal-case"> ({movie.year})</span>
                  )}
                </p>
              </div>
              {/* mt-auto: the tear lines and buttons line up at the bottom of
                  each row of cards. */}
              <div className="mt-auto pt-3">
                <Perforation small />
                <div role="group" aria-label={`Rate ${movie.title}`} className="grid grid-cols-2 gap-2 p-2.5">
                  <button
                    type="button"
                    onClick={() => rate(movie, "up")}
                    aria-label="Liked it"
                    title="Liked it"
                    className={thumbButton}
                  >
                    <ThumbsUp aria-hidden="true" className="size-5" strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    onClick={() => rate(movie, "down")}
                    aria-label="Not for me"
                    title="Not for me"
                    className={thumbButton}
                  >
                    <ThumbsDown aria-hidden="true" className="size-5" strokeWidth={2.25} />
                  </button>
                  <button type="button" onClick={() => skip(movie)} className={`col-span-2 ${quietButton}`}>
                    <EyeOff aria-hidden="true" className="size-4" />
                    Haven&rsquo;t seen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* The main button once nothing is left to rate: then it's the only
          way forward. */}
      {moreUrl && (
        <div className="mt-8 flex justify-center">
          <Link href={moreUrl} className={visible.length === 0 ? primaryButton : secondaryButton}>
            Show more movies
          </Link>
        </div>
      )}
    </>
  );
}

// Square icon buttons: on a phone a card is ~145px wide, too narrow for two
// labeled buttons side by side. The label is the aria-label (and a tooltip);
// the page's intro explains the thumbs. Like the other buttons, they fill in
// with ink on hover and while pressed.
const thumbButton =
  "inline-flex h-11 items-center justify-center border-2 border-ink text-ink transition-colors duration-150 ease-out hover:bg-ink hover:text-ticket active:bg-ink active:text-ticket motion-safe:active:translate-y-px";
