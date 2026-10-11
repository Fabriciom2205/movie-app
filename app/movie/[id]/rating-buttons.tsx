"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { secondaryButton, sectionLabel } from "@/app/ui";
import { setRating, type Verdict } from "./actions";

// The same pair as /pick's "Seen it already?", but here it shows your rating:
// your choice is filled in with ink, like a booked seat, and its thumb fills
// in too, so the choice shows by shape as well. The heading says it in words
// ("You liked this").
const OPTIONS = [
  { value: "up", label: "Liked it", Icon: ThumbsUp },
  { value: "down", label: "Not for me", Icon: ThumbsDown },
] as const;

const HEADINGS: Record<Verdict | "none", string> = {
  up: "You liked this",
  down: "Not your kind of movie",
  none: "Seen it?",
};

export function RatingButtons({ movieId, verdict }: { movieId: number; verdict: Verdict | null }) {
  // Shows the new choice immediately; falls back to the server's value once
  // the save finishes (or fails).
  const [optimisticVerdict, setOptimisticVerdict] = useOptimistic(verdict);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const headingId = useId();

  function choose(value: Verdict) {
    const next = optimisticVerdict === value ? null : value; // same button again = remove
    setError(null);
    startTransition(async () => {
      setOptimisticVerdict(next);
      const result = await setRating(movieId, next);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <p id={headingId} className={sectionLabel}>
        {HEADINGS[optimisticVerdict ?? "none"]}
      </p>

      <div role="group" aria-labelledby={headingId} aria-busy={isPending} className="mt-2 grid grid-cols-2 gap-2.5">
        {OPTIONS.map(({ value, label, Icon }) => {
          const isSelected = optimisticVerdict === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => choose(value)}
              className={`${secondaryButton} w-full aria-pressed:bg-ink aria-pressed:text-ticket`}
            >
              <Icon
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.25}
                fill={isSelected ? "currentColor" : "none"}
              />
              {label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : (
        optimisticVerdict && <p className="mt-2 text-xs text-ink-muted">Select it again to remove your rating.</p>
      )}
    </div>
  );
}
