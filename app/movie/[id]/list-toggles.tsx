"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { setMovieOnList } from "./actions";

export type ListOption = { id: string; name: string; hasMovie: boolean };

type Change = { listId: string; on: boolean };

export function ListToggles({ movieId, lists }: { movieId: number; lists: ListOption[] }) {
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
    <div className="mt-6">
      <p id={headingId} className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Your lists
      </p>

      {lists.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">
          No lists yet.{" "}
          <Link href="/lists" className="underline">
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
                className={`inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 ${
                  list.hasMovie
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                <span className="truncate">{list.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
