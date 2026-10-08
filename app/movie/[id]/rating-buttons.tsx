"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { sectionLabel, toggleButtonBase } from "@/app/ui";
import { setRating, type Verdict } from "./actions";

// Selected colors carry the meaning, as on /pick: liked = mint, not for me =
// peach, each with its dark partner as the outline. The thumb also fills in,
// so the choice shows by shape too, not only by color.
const OPTIONS = [
  {
    value: "up",
    label: "Liked it",
    Icon: ThumbsUp,
    selected: "aria-pressed:border-on-mint aria-pressed:bg-mint aria-pressed:text-on-mint",
  },
  {
    value: "down",
    label: "Not for me",
    Icon: ThumbsDown,
    selected: "aria-pressed:border-on-peach aria-pressed:bg-peach aria-pressed:text-on-peach",
  },
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

      <div
        role="group"
        aria-labelledby={headingId}
        aria-busy={isPending}
        className="mt-2 flex flex-wrap gap-2"
      >
        {OPTIONS.map(({ value, label, Icon, selected }) => {
          const isSelected = optimisticVerdict === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => choose(value)}
              className={`${toggleButtonBase} ${selected}`}
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
        optimisticVerdict && (
          <p className="mt-2 text-xs text-ink-muted">Select it again to remove your rating.</p>
        )
      )}
    </div>
  );
}
