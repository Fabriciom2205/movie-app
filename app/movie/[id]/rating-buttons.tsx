"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { setRating, type Verdict } from "./actions";

const OPTIONS = [
  {
    value: "up",
    label: "Liked it",
    Icon: ThumbsUp,
    selected:
      "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950",
  },
  {
    value: "down",
    label: "Not for me",
    Icon: ThumbsDown,
    selected:
      "border-rose-600 bg-rose-600 text-white dark:border-rose-500 dark:bg-rose-500 dark:text-rose-950",
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
    <div className="mt-6">
      <p id={headingId} className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
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
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 ${
                isSelected
                  ? selected
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
              {label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        optimisticVerdict && (
          <p className="mt-2 text-xs text-zinc-500">Select it again to remove your rating.</p>
        )
      )}
    </div>
  );
}
