"use client";

import { useState } from "react";
import Form from "next/form";
import { Check } from "lucide-react";
import { primaryButton, sectionLabel, toggleChip } from "@/app/ui";

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
          <legend className={sectionLabel}>Who&rsquo;s watching</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {people.map((p) => (
              <label key={p.id} className={toggleChip}>
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
        <legend className={sectionLabel}>
          In the mood for <span className="font-normal">(optional, pick any)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {genres.map((g) => (
            <label key={g.id} className={toggleChip}>
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
          className={`${primaryButton} w-full sm:w-auto`}
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

// The check icon inside a toggleChip, shown when its checkbox is ticked.
const checkClass = "-ml-1 hidden size-4 shrink-0 peer-checked:block";
