"use client";

import { useState } from "react";
import Form from "next/form";
import Link from "next/link";
import { TIME_LIMITS, timeLimitLabel } from "@/lib/picker-options";

export type PickerList = {
  id: string;
  name: string;
  members: { id: string; name: string; isMe: boolean }[];
};

// "What are we watching tonight?" Submits to /pick as a GET form
// (/pick?list=...&watch=...&time=...), so a result can be bookmarked or shared.
export function PickerForm({ lists }: { lists: PickerList[] }) {
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const list = lists.find((l) => l.id === listId);
  // Everyone on the chosen list is watching until unticked.
  const [watching, setWatching] = useState(() => new Set(list?.members.map((m) => m.id)));

  if (!list) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        Make a{" "}
        <Link href="/lists" className="underline">
          list
        </Link>{" "}
        of movies you want to see, and this will pick one for tonight.
      </p>
    );
  }

  function chooseList(id: string) {
    setListId(id);
    const next = lists.find((l) => l.id === id);
    setWatching(new Set(next?.members.map((m) => m.id)));
  }

  function toggle(id: string) {
    setWatching((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const shared = list.members.length > 1;
  const nobodyWatching = watching.size === 0;

  return (
    <Form action="/pick" className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          From the list
          <select
            name="list"
            value={listId}
            onChange={(e) => chooseList(e.target.value)}
            className="rounded-md border border-zinc-300 bg-background px-3 py-2 text-base font-normal text-foreground dark:border-zinc-700"
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600 sm:w-48 dark:text-zinc-400">
          Time you have
          <select
            name="time"
            defaultValue=""
            className="rounded-md border border-zinc-300 bg-background px-3 py-2 text-base font-normal text-foreground dark:border-zinc-700"
          >
            <option value="">Any length</option>
            {TIME_LIMITS.map((minutes) => (
              <option key={minutes} value={minutes}>
                Up to {timeLimitLabel(minutes)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Only worth asking when the list is shared. Unticked people's ratings
          still count: their likes rank a movie higher. */}
      {shared && (
        <fieldset>
          <legend className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Who&rsquo;s watching
          </legend>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
            {list.members.map((m) => (
              <label key={m.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="watch"
                  value={m.id}
                  checked={watching.has(m.id)}
                  onChange={() => toggle(m.id)}
                  className="h-4 w-4 accent-zinc-900 dark:accent-zinc-200"
                />
                {m.isMe ? "You" : m.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={nobodyWatching}
          className="rounded-md bg-foreground px-5 py-2 font-medium text-background disabled:opacity-60"
        >
          Pick a movie
        </button>
        {nobodyWatching && <p className="text-sm text-zinc-500">Tick at least one person.</p>}
      </div>
    </Form>
  );
}
