"use client";

import { useState, useTransition } from "react";
import { CircleCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { setRating, type Verdict } from "@/app/movie/[id]/actions";
import { secondaryButton, sectionLabel, tag } from "@/app/ui";

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
    <div>
      {/* Always in the page so screen readers hear the message when it appears. */}
      <div aria-live="polite">
        {saved && !isPending && (
          <p className={`mb-4 ${tag} bg-sage text-on-sage`}>
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {saved.verdict === "up"
              ? `Saved: you liked ${saved.title}.`
              : `Saved: ${saved.title} wasn’t for you.`}
          </p>
        )}
      </div>

      <p className={sectionLabel}>Seen it already?</p>
      <div role="group" aria-label={`Rate ${title}`} aria-busy={isPending} className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => rate("up")} disabled={isPending} className={secondaryButton}>
          <ThumbsUp aria-hidden="true" className="size-4" strokeWidth={2.25} />
          {isPending && saving === "up" ? "Saving…" : "Liked it"}
        </button>
        <button type="button" onClick={() => rate("down")} disabled={isPending} className={secondaryButton}>
          <ThumbsDown aria-hidden="true" className="size-4" strokeWidth={2.25} />
          {isPending && saving === "down" ? "Saving…" : "Not for me"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
