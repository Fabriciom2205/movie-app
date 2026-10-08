"use client"; // error boundaries must be Client Components

import Link from "next/link";

// Shown when recommending fails, e.g. TMDB or the database didn't answer.
export default function PickError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Couldn&rsquo;t find a movie</h1>
      <p className="mt-2 text-ink-muted">
        Checking what&rsquo;s streaming didn&rsquo;t work this time. It&rsquo;s usually a hiccup.
      </p>
      <div className="mt-6 flex gap-4">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          Try again
        </button>
        <Link href="/" className="self-center text-sm text-ink-muted hover:underline">
          Back home
        </Link>
      </div>
    </main>
  );
}
