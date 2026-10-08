import Link from "next/link";
import { SearchX } from "lucide-react";
import { card, primaryButton } from "@/app/ui";

// Shown for a movie or list that doesn't exist (notFound() in those pages)
// and for any URL that matches no page. Replaces Next's built-in 404, which
// follows the device's dark mode instead of this always-light design.
export default function NotFound() {
  return (
    <main id="content" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <div className={`mt-14 shadow-soft ${card}`}>
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-soft text-on-soft">
          <SearchX aria-hidden="true" className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">We couldn&rsquo;t find that page</h1>
        <p className="mt-2 leading-relaxed">
          The movie or list may not exist, or the link is missing a piece. Start again from home.
        </p>
        <div className="mt-6">
          <Link href="/" className={primaryButton}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
