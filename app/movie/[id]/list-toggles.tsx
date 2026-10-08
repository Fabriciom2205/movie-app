"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { sectionLabel, toggleButton } from "@/app/ui";
import { setMovieOnList } from "./actions";

export type ListOption = { id: string; name: string; hasMovie: boolean };

type Change = { listId: string; on: boolean };

// Used on the movie page and on /pick; `className` is for the caller's spacing.
export function ListToggles({
  movieId,
  lists,
  className,
}: {
  movieId: number;
  lists: ListOption[];
  className?: string;
}) {
  // Each click is queued as a change on top of the server's data, so several
  // lists can be toggled at once. Once every save finishes, React drops the
  // changes and shows the server's (refreshed) data again.
  const [optimisticLists, applyChange] = useOptimistic(lists, (state, change: Change) =>
    state.map((l) => (l.id === change.listId ? { ...l, hasMovie: change.on } : l)),
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const headingId = useId();

  function toggle(list: ListOption) {
    const change = { listId: list.id, on: !list.hasMovie };
    setError(null);
    startTransition(async () => {
      applyChange(change);
      const result = await setMovieOnList(change.listId, movieId, change.on);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className={className}>
      <p id={headingId} className={sectionLabel}>
        Your lists
      </p>

      {lists.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">
          No lists yet.{" "}
          <Link href="/lists" className="font-semibold text-on-soft underline underline-offset-2">
            Make one
          </Link>{" "}
          to save movies for later.
        </p>
      ) : (
        <div
          role="group"
          aria-labelledby={headingId}
          aria-busy={isPending}
          className="mt-2 flex flex-wrap gap-2"
        >
          {optimisticLists.map((list) => {
            const Icon = list.hasMovie ? Check : Plus;
            return (
              <button
                key={list.id}
                type="button"
                aria-pressed={list.hasMovie}
                onClick={() => toggle(list)}
                className={toggleButton}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
                <span className="truncate">{list.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
