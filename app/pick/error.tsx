"use client"; // error boundaries must be Client Components

import Link from "next/link";
import { CloudOff } from "lucide-react";
import { card, primaryButton, quietButton } from "@/app/ui";

// Shown when recommending fails, e.g. TMDB or the database didn't answer.
export default function PickError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="content" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <div className={`mt-14 shadow-soft ${card}`}>
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-soft text-on-soft">
          <CloudOff aria-hidden="true" className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Couldn&rsquo;t find a movie</h1>
        <p className="mt-2 leading-relaxed">
          Checking what&rsquo;s streaming didn&rsquo;t work this time. It&rsquo;s usually a hiccup, so try again.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => retry()} className={primaryButton}>
            Try again
          </button>
          <Link href="/" className={quietButton}>
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
