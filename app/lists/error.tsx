"use client"; // error boundaries must be Client Components

import Link from "next/link";
import { CloudOff } from "lucide-react";
import { card, primaryButton, quietButton } from "@/app/ui";

// Shown when something under /lists throws: a failed database read, or one of
// the button actions (remove, delete, leave) failing.
export default function ListsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="content" className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <div className={`mt-14 shadow-soft ${card}`}>
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-soft text-on-soft">
          <CloudOff aria-hidden="true" className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 leading-relaxed">That didn&rsquo;t work. It may be a hiccup on our side, so try again.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => retry()} className={primaryButton}>
            Try again
          </button>
          <Link href="/lists" className={quietButton}>
            Back to your lists
          </Link>
        </div>
      </div>
    </main>
  );
}
