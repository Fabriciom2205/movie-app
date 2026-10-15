"use client"; // error boundaries must be Client Components

import Link from "next/link";
import { CloudOff } from "lucide-react";
import { WallCard } from "@/app/ticket";
import { primaryButton, quietButton, wallColumn } from "@/app/ui";

// Shown when something under /lists throws: a failed database read, or one of
// the button actions (remove, delete, leave) failing. A ticket on the wall,
// below the back link's room, like /pick's error.
export default function ListsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="content" className={`${wallColumn} max-w-2xl`}>
      <WallCard tape className="mt-17">
        <div className="mb-4 grid size-12 place-items-center border-2 border-ink">
          <CloudOff aria-hidden="true" className="size-6" />
        </div>
        <h1 className="text-4xl">Something went wrong</h1>
        <p className="mt-3 leading-relaxed">That didn&rsquo;t work. It may be a hiccup on our side, so try again.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => retry()} className={primaryButton}>
            Try again
          </button>
          <Link href="/lists" className={quietButton}>
            Back to your lists
          </Link>
        </div>
      </WallCard>
    </main>
  );
}
