"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Image from "next/image";
import { saveSettings, type SaveState } from "./actions";

export type ProviderOption = {
  id: number;
  name: string;
  logoUrl: string;
};

type Props = {
  displayName: string;
  region: string;
  regions: { code: string; name: string }[];
  providers: ProviderOption[]; // shortlist first
  shortlist: number[];
  saved: number[];
};

const initialState: SaveState = { status: "idle", message: null };

export function SettingsForm({ displayName, region, regions, providers, shortlist, saved }: Props) {
  const [state, formAction, pending] = useActionState(saveSettings, initialState);
  const [selectedRegion, setSelectedRegion] = useState(region);
  const [checked, setChecked] = useState(() => new Set(saved));
  const [filter, setFilter] = useState("");
  // Hides "Saved." again as soon as something changes after a save.
  const [dirty, setDirty] = useState(false);

  // With no filter: the shortlist, plus anything saved or ticked (so a service
  // never vanishes while you're looking at it). With a filter: every match.
  const query = normalize(filter);
  const alwaysShown = new Set([...shortlist, ...saved]);
  const isVisible = (p: ProviderOption) =>
    query ? normalize(p.name).includes(query) : alwaysShown.has(p.id) || checked.has(p.id);
  const visibleCount = providers.filter(isVisible).length;

  function toggle(id: number) {
    setDirty(true);
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Run the action ourselves instead of letting <form action> do it: React
  // resets a form after its action finishes, which would untick every
  // checkbox on screen while our state still has them ticked, and the next
  // Save would then delete them all. (`action` stays for submits that happen
  // before this JavaScript loads.)
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDirty(false);
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className="text-xl font-semibold">Your name</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Shown to the people you share a list with.
        </p>
        <input
          name="display_name"
          defaultValue={displayName}
          onChange={() => setDirty(true)}
          aria-label="Your name"
          maxLength={50}
          required
          autoComplete="nickname"
          className="mt-3 w-full max-w-xs rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold">Country</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Streaming catalogs differ by country. Saving a new country updates the list of services
          below.
        </p>
        <select
          name="region"
          value={selectedRegion}
          onChange={(e) => {
            setSelectedRegion(e.target.value);
            setDirty(true);
          }}
          aria-label="Country"
          className="mt-3 w-full max-w-xs rounded-md border border-zinc-300 bg-background px-3 py-2 dark:border-zinc-700"
        >
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Your streaming services</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {checked.size === 0
            ? "None selected yet."
            : `${checked.size} selected.`}{" "}
          Search to find services that aren&rsquo;t listed.
        </p>

        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search services…"
          aria-label="Search services"
          className="mt-3 w-full max-w-xs rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />

        {/* Hidden services stay in the form (just not displayed), so ticked
            ones are still submitted while the filter hides them. */}
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {providers.map((p) => (
            <li key={p.id} hidden={!isVisible(p)}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-2 has-checked:border-zinc-900 has-checked:bg-zinc-100 has-focus-visible:outline-2 has-focus-visible:outline-zinc-500 dark:border-zinc-800 dark:has-checked:border-zinc-300 dark:has-checked:bg-zinc-900">
                <input
                  type="checkbox"
                  name="provider"
                  value={p.id}
                  checked={checked.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 accent-zinc-900 dark:accent-zinc-200"
                />
                <Image
                  src={p.logoUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-md"
                />
                <span className="min-w-0 truncate text-sm">{p.name}</span>
              </label>
            </li>
          ))}
        </ul>

        {query && visibleCount === 0 && (
          <p className="mt-4 text-sm text-zinc-500">No services match &ldquo;{filter}&rdquo;.</p>
        )}
      </section>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <p
          aria-live="polite"
          className={`text-sm ${
            state.status === "error" ? "text-red-600 dark:text-red-400" : "text-zinc-500"
          }`}
        >
          {!dirty && !pending && state.message}
        </p>
      </div>
    </form>
  );
}

// "Disney+" and "disney plus" should both find "Disney Plus".
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replaceAll("+", "plus")
    .replace(/[^a-z0-9]/g, "");
}
