import Link from "next/link";
import { SearchX } from "lucide-react";
import { WallCard } from "@/app/ticket";
import { primaryButton, wallColumn } from "@/app/ui";

// Shown for a movie or list that doesn't exist (notFound() in those pages)
// and for any URL that matches no page. Replaces Next's built-in 404, which
// follows the device's dark mode instead of this always-light design. A
// ticket taped to the wall where a page's content would start (below the
// back link's room), like the error screens.
export default function NotFound() {
  return (
    <main id="content" className={`${wallColumn} max-w-2xl`}>
      <WallCard tape className="mt-17">
        <div className="mb-4 grid size-12 place-items-center border-2 border-ink">
          <SearchX aria-hidden="true" className="size-6" />
        </div>
        <h1 className="text-4xl">We couldn&rsquo;t find that page</h1>
        <p className="mt-3 leading-relaxed">
          The movie or list may not exist, or the link is missing a piece. Start again from home.
        </p>
        <div className="mt-6">
          <Link href="/" className={primaryButton}>
            Go home
          </Link>
        </div>
      </WallCard>
    </main>
  );
}
