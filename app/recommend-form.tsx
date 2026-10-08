"use client";

import { useState } from "react";
import Form from "next/form";
import { Check } from "lucide-react";

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
    <Form action="/pick" className="flex flex-col gap-6">
      {/* Only worth asking once you share a list with someone. */}
      {people.length > 1 && (
        <fieldset>
          <legend className={legendClass}>Who&rsquo;s watching</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {people.map((p) => (
              <label key={p.id} className={chipClass}>
                <input
                  type="checkbox"
                  name="watch"
                  value={p.id}
                  checked={watching.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="peer sr-only"
                />
                <Check aria-hidden="true" className={checkClass} />
                {p.isMe ? "You" : p.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className={legendClass}>
          In the mood for <span className="font-normal">(optional, pick any)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {genres.map((g) => (
            <label key={g.id} className={chipClass}>
              <input
                type="checkbox"
                name="genre"
                value={g.id}
                defaultChecked={initialGenres.includes(g.id)}
                className="peer sr-only"
              />
              <Check aria-hidden="true" className={checkClass} />
              {g.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="submit"
          disabled={nobodyWatching}
          className="h-12 w-full rounded-full bg-primary px-7 font-heading text-lg font-medium text-on-primary transition-colors duration-150 ease-out hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary motion-safe:active:translate-y-px sm:w-auto"
        >
          Recommend a movie
        </button>
        {/* Always in the page so screen readers hear it when it appears. */}
        <p aria-live="polite" className="text-sm text-ink-muted">
          {nobodyWatching && "Tick at least one person."}
        </p>
      </div>
    </Form>
  );
}

const legendClass = "text-sm font-semibold text-ink-muted";

// A checkbox drawn as a pill (MASTER.md "Toggle pills"): the real input is
// visually hidden (sr-only) but still focusable and announced; the label shows
// its state. Selected = soft blue, a primary outline and a check icon, so it
// isn't told by color alone. Works before JavaScript loads (CSS only).
const chipClass =
  "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-2 border-line bg-card px-4 text-sm font-semibold select-none transition-colors duration-150 ease-out hover:bg-soft has-checked:border-primary has-checked:bg-soft has-checked:text-on-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary motion-safe:active:translate-y-px";

const checkClass = "-ml-1 hidden size-4 shrink-0 peer-checked:block";
