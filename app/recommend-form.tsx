"use client";

import { useState } from "react";
import Form from "next/form";
import { Check, X } from "lucide-react";
import { Perforation } from "@/app/ticket";
import { primaryButton, sectionLabel } from "@/app/ui";

export type FormPerson = { id: string; name: string; isMe: boolean };
export type FormGenre = { id: number; name: string };

// "What are we watching tonight?" Submits to /pick as a GET form
// (/pick?watch=...&genre=...), so a recommendation can be bookmarked or shared.
// It fills the bottom of the home page's ticket: the choices, the tear line,
// then the stub with the button. The ticket around it is in app/page.tsx.
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
    <Form action="/pick">
      <div className="flex flex-col gap-5 px-5 sm:px-6">
        {/* Only worth asking once you share a list with someone. Each person
            is a seat on the ticket: filled in = watching. */}
        {people.length > 1 && (
          <fieldset>
            <legend className={sectionLabel}>Who&rsquo;s watching</legend>
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {people.map((p, i) => (
                <label key={p.id} className={seat}>
                  <input
                    type="checkbox"
                    name="watch"
                    value={p.id}
                    checked={watching.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="peer sr-only"
                  />
                  {/* "Seat A" is decoration: the checkbox's name is just the person. */}
                  <span aria-hidden="true" className="text-[10px] tracking-widest uppercase">
                    Seat {String.fromCharCode(65 + i)}
                  </span>
                  <span className="max-w-full truncate font-heading text-2xl leading-none tracking-wide uppercase sm:text-3xl">
                    {p.isMe ? "You" : p.name}
                  </span>
                  <Check aria-hidden="true" className="absolute top-2 right-2 hidden size-4 peer-checked:block" />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Genres are the tick boxes printed on a ticket: ticked = a purple
            box with a white X. */}
        <fieldset>
          <legend className={sectionLabel}>In the mood for &middot; pick any, or none</legend>
          <div className="mt-1 flex flex-wrap gap-x-3 sm:gap-x-4">
            {genres.map((g) => (
              <label key={g.id} className={tickBox}>
                <input
                  type="checkbox"
                  name="genre"
                  value={g.id}
                  defaultChecked={initialGenres.includes(g.id)}
                  className="peer sr-only"
                />
                <span aria-hidden="true" className={box}>
                  <X className="hidden size-3 group-has-checked:block" strokeWidth={3.5} />
                </span>
                {g.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <Perforation className="mt-4 sm:mt-5" />

      {/* The stub: the one main button, then the fine print (how many it admits). */}
      <div className="flex flex-col gap-2.5 px-5 pt-4 pb-4 sm:px-6 sm:pb-5">
        <button type="submit" disabled={nobodyWatching} className={`${primaryButton} w-full`}>
          Recommend a movie
        </button>
        <p className={`${sectionLabel} flex justify-between gap-4`}>
          <span>Admit {watching.size}</span>
          <span>On your services</span>
        </p>
        {/* Always in the page so screen readers hear it when it appears. */}
        <p aria-live="polite" className="text-sm text-ink-muted empty:hidden">
          {nobodyWatching && "Tick at least one person."}
        </p>
      </div>
    </Form>
  );
}

// A seat: a box with an ink outline that fills in with ink when ticked (the
// check icon shows too, so it isn't told by color alone).
const seat =
  "relative flex min-h-14 cursor-pointer select-none flex-col items-start justify-center gap-0.5 border-2 border-ink px-3 py-2 transition-colors duration-150 ease-out hover:bg-ink/10 has-checked:bg-ink has-checked:text-ticket has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary";

// A genre: the tick box, then its name in typewriter capitals.
const tickBox =
  "group inline-flex min-h-10 cursor-pointer select-none items-center gap-1.5 text-xs font-medium uppercase sm:gap-2 sm:tracking-wide has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary";

const box =
  "grid size-4 shrink-0 place-items-center border-2 border-ink text-on-primary transition-colors duration-150 ease-out group-hover:bg-ink/10 peer-checked:border-primary peer-checked:bg-primary";
