"use client"; // error boundaries must be Client Components

import Link from "next/link";

// Shown when something under /lists throws: a failed database read, or one of
// the button actions (remove, delete, leave) failing.
export default function ListsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-ink-muted">That didn&rsquo;t work. It may be a hiccup on our side.</p>
      <div className="mt-6 flex gap-4">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          Try again
        </button>
        <Link href="/lists" className="self-center text-sm text-ink-muted hover:underline">
          Back to your lists
        </Link>
      </div>
    </main>
  );
}
