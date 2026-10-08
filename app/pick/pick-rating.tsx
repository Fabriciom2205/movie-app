"use client";

import { useState, useTransition } from "react";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { setRating, type Verdict } from "@/app/movie/[id]/actions";

// "Seen it already?" on the pick page. A rating means you've seen it, so the
// saved rating makes the recommender move on: setRating refreshes the page,
// and the refreshed pick leaves this movie out.
//
// This component stays mounted while the movie above it changes, so the
// "Saved: you liked X" line is still here to explain why there's a new movie.
export function PickRating({ movieId, title }: { movieId: number; title: string }) {
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState<Verdict | null>(null);
  const [saved, setSaved] = useState<{ title: string; verdict: Verdict } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function rate(verdict: Verdict) {
    setError(null);
    setSaving(verdict);
    startTransition(async () => {
      const result = await setRating(movieId, verdict);
      if (result.error) setError(result.error);
      else setSaved({ title, verdict });
    });
  }

  return (
    <div className="mt-6">
      <p aria-live="polite" className="min-h-5 text-sm text-zinc-600 dark:text-zinc-400">
        {saved && !isPending && (
          <span className="inline-flex items-center gap-1.5">
            <Check aria-hidden="true" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {saved.verdict === "up"
              ? `Saved: you liked ${saved.title}.`
              : `Saved: ${saved.title} wasn't for you.`}
          </span>
        )}
      </p>

      <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Seen it already?</p>
      <div role="group" aria-label={`Rate ${title}`} aria-busy={isPending} className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => rate("up")} disabled={isPending} className={buttonClass}>
          <ThumbsUp aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
          {isPending && saving === "up" ? "Saving…" : "Liked it"}
        </button>
        <button type="button" onClick={() => rate("down")} disabled={isPending} className={buttonClass}>
          <ThumbsDown aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
          {isPending && saving === "down" ? "Saving…" : "Not for me"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

const buttonClass =
  "inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";
