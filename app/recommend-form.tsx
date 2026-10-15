"use client";

import { useState, type ReactNode } from "react";
import Form from "next/form";
import { Check, X } from "lucide-react";
import { TearLine } from "@/app/ticket";
import { paper, primaryButton, sectionLabel } from "@/app/ui";

export type FormPerson = { id: string; name: string; isMe: boolean };
export type FormGenre = { id: number; name: string };

// "What are we watching tonight?" Submits to /pick as a GET form
// (/pick?watch=...&genre=...), so a recommendation can be bookmarked or shared.
// It is the home page's ticket, taped to the room's wall: two pieces of
// paper, each cut by its own mask from globals.css (ticket-cut-top and
// ticket-cut-stub: corners, the notches at the tear line, the bites down the
// sides). The top piece is a printed frame around `children` (what the
// ticket is for, the date stamp, the question), the seats and the genres;
// the stub has the button and the printed boxes. The tape, the tilt and the
// outline are around it, in app/page.tsx.
export function RecommendForm({
  people,
  genres,
  initialWatchers,
  initialGenres,
  children,
}: {
  people: FormPerson[]; // you first, then the people you share a list with
  genres: FormGenre[];
  initialWatchers: string[]; // who's ticked when the page opens
  initialGenres: number[];
  children: ReactNode; // the top of the ticket, above the choices
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
      {/* The top piece. Its own top and bottom padding is where the side
          bites stop, so the sides are padded by the div inside instead. On
          phones the frame and the text sit closer to the edges, so the 18
          genres still fit in 6 rows (the button stays on the first screen). */}
      <div className={`ticket-cut-top relative ${paper} py-4 sm:py-5`}>
        <span
          aria-hidden="true"
          className="printed-frame pointer-events-none absolute inset-x-2.5 top-3.5 bottom-2 sm:inset-x-5 sm:top-4.5 sm:bottom-2.5"
        />
        <div className="flex flex-col gap-5 px-5.5 pt-3 pb-2 sm:px-10 sm:pt-4">
          <div>{children}</div>

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
            <div className="mt-1 flex flex-wrap gap-x-2.5 sm:gap-x-4">
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
      </div>

      {/* The stub: the tear line's perforation holes, the one main button,
          then the printed boxes: how many it admits, where it's showing, and
          the fine print every real ticket has. It overlaps the top piece by
          1px: tilted, the two edges are smoothed separately and would leave a
          faint line where they meet. */}
      <div className={`ticket-cut-stub relative -mt-px ${paper} py-4 sm:py-5`}>
        <TearLine />
        <div className="flex flex-col gap-3 px-3.5 pt-1 pb-1 sm:px-5">
          <button type="submit" disabled={nobodyWatching} className={`${primaryButton} w-full`}>
            Recommend a movie
          </button>
          <div className="printed-frame relative grid sm:grid-cols-[auto_1fr]">
            <dl className="grid grid-cols-[auto_1fr]">
              <div className="px-4 pt-2 pb-3">
                <dt className={sectionLabel}>Admit</dt>
                <dd className="mt-1 font-heading text-5xl leading-[0.85]">{watching.size}</dd>
              </div>
              <div className="border-l-[1.5px] border-ink/50 px-4 pt-2 pb-3">
                <dt className={sectionLabel}>Screen</dt>
                <dd className="mt-1.5 font-heading text-3xl leading-[0.95] tracking-wide whitespace-nowrap uppercase">
                  Your services
                </dd>
              </div>
            </dl>
            <p className="hidden self-center border-l-[1.5px] border-ink/50 px-4 py-2 text-[11px] leading-snug text-ink-muted sm:block">
              This ticket is good for one movie, tonight only. Not transferable.
            </p>
            {/* The printer's name, set into the bottom rule. */}
            <span
              aria-hidden="true"
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-ticket px-2 text-[9px] leading-3.5 font-medium tracking-[0.16em] whitespace-nowrap text-ink-muted uppercase"
            >
              Moonlit Room Ticket Co.
            </span>
          </div>
          {/* Always in the page so screen readers hear it when it appears. */}
          <p aria-live="polite" className="text-sm text-ink-muted empty:hidden">
            {nobodyWatching && "Tick at least one person."}
          </p>
        </div>
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
