"use client";

import { startTransition, useActionState, useId, useState, type FormEvent } from "react";
import Image from "next/image";
import { Check, ChevronDown, CircleCheck, Search } from "lucide-react";
import { card, field, primaryButton, sectionLabel, tag } from "@/app/ui";
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
  const id = useId(); // prefix for the label/description ids below

  // With no filter: the shortlist, plus anything saved or ticked (so a service
  // never vanishes while you're looking at it). With a filter: every match.
  const query = normalize(filter);
  const alwaysShown = new Set([...shortlist, ...saved]);
  const isVisible = (p: ProviderOption) =>
    query ? normalize(p.name).includes(query) : alwaysShown.has(p.id) || checked.has(p.id);
  const visibleCount = providers.filter(isVisible).length;

  function toggle(providerId: number) {
    setDirty(true);
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
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
    <form action={formAction} onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
      <section className={card}>
        <h2 className="text-xl font-semibold tracking-tight">About you</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-name`} className={sectionLabel}>
              Your name
            </label>
            <input
              id={`${id}-name`}
              name="display_name"
              defaultValue={displayName}
              onChange={() => setDirty(true)}
              aria-describedby={`${id}-name-help`}
              maxLength={50}
              required
              autoComplete="nickname"
              className={`mt-2 ${field}`}
            />
            <p id={`${id}-name-help`} className="mt-1.5 text-sm text-ink-muted">
              Shown to the people you share a list with.
            </p>
          </div>

          <div>
            <label htmlFor={`${id}-region`} className={sectionLabel}>
              Country
            </label>
            {/* A native select (best on phones), with its own arrow swapped
                for one that matches the design. */}
            <div className="relative mt-2">
              <select
                id={`${id}-region`}
                name="region"
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setDirty(true);
                }}
                aria-describedby={`${id}-region-help`}
                className={`${field} appearance-none pr-10 text-ink`}
              >
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-ink-muted"
              />
            </div>
            <p id={`${id}-region-help`} className="mt-1.5 text-sm text-ink-muted">
              Streaming catalogs differ by country. Saving a new one updates the services below.
            </p>
          </div>
        </div>
      </section>

      <section className={card} aria-labelledby={`${id}-services`}>
        <h2 id={`${id}-services`} className="text-xl font-semibold tracking-tight">
          Your streaming services
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {checked.size === 0 ? "None selected yet." : `${checked.size} selected.`} Search to find services that
          aren&rsquo;t listed.
        </p>

        <div className="relative mt-4 sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search services…"
            aria-label="Search services"
            autoComplete="off"
            className={`${field} pl-11`}
          />
        </div>

        {/* Hidden services stay in the form (just not displayed), so ticked
            ones are still submitted while the filter hides them. */}
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {providers.map((p) => (
            <li key={p.id} hidden={!isVisible(p)}>
              {/* An option card around a visually hidden checkbox; the round
                  check on the right fills in when it's ticked. */}
              <label className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-field border-2 border-line bg-card p-2 pr-3 transition-colors duration-150 ease-out select-none hover:bg-soft has-checked:border-primary has-checked:bg-soft has-checked:text-on-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary">
                <input
                  type="checkbox"
                  name="provider"
                  value={p.id}
                  checked={checked.has(p.id)}
                  onChange={() => toggle(p.id)}
                  // On the checkbox itself (it's what gets focus, so it's what
                  // the browser scrolls into view): keeps a card tabbed to near
                  // the bottom from hiding behind the sticky Save bar.
                  className="sr-only scroll-mb-28"
                />
                <Image src={p.logoUrl} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink-muted text-on-primary group-has-checked:border-primary group-has-checked:bg-primary"
                >
                  <Check className="hidden size-4 group-has-checked:block" strokeWidth={3} />
                </span>
              </label>
            </li>
          ))}
        </ul>

        {query && visibleCount === 0 && (
          <p className="mt-4 text-sm text-ink-muted">
            No services match &ldquo;{filter}&rdquo;. Try part of the name, like &ldquo;max&rdquo;.
          </p>
        )}
      </section>

      {/* Stays at the bottom of the screen while the form is on it, so Save is
          always in reach after ticking a service far down the list. */}
      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-4 border-t-2 border-line bg-page/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : "Save"}
        </button>
        <div aria-live="polite" className="min-w-0 text-sm">
          {pending ? null : dirty ? (
            <p className="text-ink-muted">Unsaved changes</p>
          ) : state.status === "error" ? (
            <p className="text-danger">{state.message}</p>
          ) : (
            state.message && (
              <p className={`${tag} bg-sage text-on-sage`}>
                <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {state.message}
              </p>
            )
          )}
        </div>
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
