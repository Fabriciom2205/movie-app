"use client";

import { useState } from "react";
import Form from "next/form";

export type FormPerson = { id: string; name: string; isMe: boolean };
export type FormGenre = { id: number; name: string };

// "What are we watching tonight?" Submits to /pick as a GET form
// (/pick?watch=...&genre=...), so a recommendation can be bookmarked or shared.
export function RecommendForm({
  people,
  genres,
  initialWatchers,
  initialGenres,
}: {
  people: FormPerson[]; // you first, then the people you share a list with
  genres: FormGenre[];
  initialWatchers: string[]; // who's ticked when the page opens
  initialGenres: number[];
}) {
  const [watching, setWatching] = useState(() => new Set(initialWatchers));

  function toggle(id: string) {
    setWatching((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const nobodyWatching = watching.size === 0;

  return (
    <Form action="/pick" className="flex flex-col gap-5">
      {/* Only worth asking once you share a list with someone. */}
      {people.length > 1 && (
        <fieldset>
          <legend className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Who&rsquo;s watching</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {people.map((p) => (
              <label key={p.id} className={chipClass}>
                <input
                  type="checkbox"
                  name="watch"
                  value={p.id}
                  checked={watching.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="sr-only"
                />
                {p.isMe ? "You" : p.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          In the mood for <span className="font-normal text-zinc-500">(optional, pick any)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {genres.map((g) => (
            <label key={g.id} className={chipClass}>
              <input
                type="checkbox"
                name="genre"
                value={g.id}
                defaultChecked={initialGenres.includes(g.id)}
                className="sr-only"
              />
              {g.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={nobodyWatching}
          className="rounded-md bg-foreground px-5 py-2 font-medium text-background disabled:opacity-60"
        >
          Recommend a movie
        </button>
        {nobodyWatching && <p className="text-sm text-zinc-500">Tick at least one person.</p>}
      </div>
    </Form>
  );
}

// A checkbox drawn as a pill: the real input is visually hidden (sr-only) but
// still focusable and announced; the label shows its state.
const chipClass =
  "cursor-pointer select-none rounded-full border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 has-checked:border-zinc-900 has-checked:bg-zinc-900 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:has-checked:border-zinc-100 dark:has-checked:bg-zinc-100 dark:has-checked:text-zinc-900";
