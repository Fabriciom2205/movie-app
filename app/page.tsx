import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { Film } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { WallTicket } from "@/app/ticket";
import { DateStamp } from "@/app/ticket-date";
import { field, fieldTicketButton, focusRingOnArt, sectionLabel, sectionLabelOnArt, wallColumn } from "@/app/ui";
import { createClient } from "@/lib/supabase/server";
import { getMovieGenres, releaseYear, searchMovies, tmdbImageUrl } from "@/lib/tmdb";
import { RecommendForm, type FormPerson } from "./recommend-form";

// Below this many ratings, the home page suggests rating some movies.
const FEW_RATINGS = 10;

// Not a mood anyone picks for movie night.
const HIDDEN_GENRES = new Set([10770]); // TV Movie

export default async function Home(props: PageProps<"/">) {
  const params = await props.searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;

  const [results, profiles, genres, myRatings] = await Promise.all([
    query ? searchMovies(query) : Promise.resolve([]),
    // RLS: you and the people you share a list with.
    supabase.from("profiles").select("user_id, display_name"),
    getMovieGenres(),
    // Just the count of your own ratings (head: no rows are sent).
    supabase.from("ratings").select("movie_id", { count: "exact", head: true }).eq("user_id", userId ?? ""),
  ]);
  if (profiles.error) throw profiles.error;
  const ratingCount = myRatings.count ?? 0;

  const people = toPeople(profiles.data, userId);
  const myName = people.find((p) => p.isMe)?.name;
  // Coming back from /pick: keep what was chosen (/?watch=...&genre=...).
  const asked = ([] as string[]).concat(params.watch ?? []).filter((id) => people.some((p) => p.id === id));
  const askedGenres = ([] as string[]).concat(params.genre ?? []).map(Number);

  // The home page has no panel: everything sits straight on the room art,
  // and the picker is a ticket taped to the wall (MASTER.md "Home page").
  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-2 px-4 text-on-night text-shadow-md text-shadow-night sm:mb-6 sm:px-2">
        <h1 className="flex shrink-0 items-center gap-3 text-3xl sm:text-4xl">
          <TicketMark />
          Movie Night
        </h1>
        <nav aria-label="Main" className="flex min-w-0 items-center">
          {/* Who's signed in: your display name (Settings), or the email until
              there is one. Only where there's room. */}
          <span className="mr-1.5 hidden truncate border-r border-on-night/30 py-1 pr-3 text-xs font-medium tracking-wide uppercase opacity-75 md:block">
            {myName ?? auth?.claims.email}
          </span>
          <Link href="/lists" className={navItem}>
            Lists
          </Link>
          <Link href="/rate" className={navItem}>
            Rate
          </Link>
          <Link href="/settings" className={navItem}>
            Settings
          </Link>
          <form action={signOut} className="shrink-0">
            <button type="submit" className={navItem}>
              Sign&nbsp;out
            </button>
          </form>
        </nav>
      </header>

      <main className={`${wallColumn} max-w-152`}>
        {/* The picker: a ticket taped to the wall, a little crooked. */}
        <WallTicket tape className="mt-3.5">
          <section id="content" aria-labelledby="picker-title">
            <RecommendForm
              people={people}
              genres={genres.filter((g) => !HIDDEN_GENRES.has(g.id)).sort((a, b) => a.name.localeCompare(b.name))}
              initialWatchers={asked.length ? asked : people.map((p) => p.id)} // default: everyone
              initialGenres={askedGenres}
            >
              <p className={sectionLabel}>
                The Moonlit Room<span className="max-sm:hidden"> &middot; Home cinema</span>
              </p>
              {/* Today's date, stamped over the frame's corner. */}
              <DateStamp className="absolute top-0 right-3 size-21 sm:top-1.5 sm:right-7.5 sm:size-29" />
              <h2 id="picker-title" className="mt-2 text-4xl sm:mt-2.5 sm:text-6xl">
                What are we watching tonight?
              </h2>
            </RecommendForm>
          </section>
        </WallTicket>

        {/* While your taste is still unknown: a small pink ticket on the wall,
            tilted the other way, its notches cut through to the room. Below
            the picker, so "Recommend a movie" stays on a phone's first screen. */}
        {ratingCount < FEW_RATINGS && (
          <WallTicket tilt="rotate-[0.8deg]" className="mt-8">
            <p className="side-notches-cut bg-ticket-pink px-7.5 py-3.5 text-[13px] leading-relaxed text-pretty">
              <Link href="/rate" className="font-medium underline underline-offset-3">
                Rate a few movies you&rsquo;ve seen
              </Link>{" "}
              so recommendations learn your taste
              {/* Non-breaking spaces keep "(3 so far)" on one line. */}
              {ratingCount > 0 && ` (${ratingCount} so far)`}.
            </p>
          </WallTicket>
        )}

        {/* action="" submits to this same page as /?q=... */}
        <Form action="" className="mt-9 mb-8">
          <label htmlFor="search" className={`${sectionLabelOnArt} mb-1.5 block`}>
            Or look up a movie
          </label>
          <div className="flex gap-2">
            <input
              key={query} // resets the box when navigating back/forward
              id="search"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Title"
              autoComplete="off"
              enterKeyHint="search"
              className={`${field} ${focusRingOnArt}`}
            />
            <button type="submit" className={`${fieldTicketButton} ${focusRingOnArt}`}>
              Find
            </button>
          </div>
        </Form>

        {query && results.length === 0 && (
          <p className="text-on-night text-shadow-md text-shadow-night">
            No movies found for &ldquo;{query}&rdquo;. Try another spelling or fewer words.
          </p>
        )}

        {/* Each result is a small ticket on the wall: poster, then a dashed
            tear line, then the title. Hover lightens the stock. */}
        <ul className="flex flex-col gap-4">
          {results.map((movie) => {
            const year = releaseYear(movie.release_date);
            return (
              <li key={movie.id} className="on-the-wall">
                <Link
                  href={`/movie/${movie.id}`}
                  className={`flex gap-4 bg-ticket p-3.5 transition-colors duration-150 ease-out hover:bg-soft ${focusRingOnArt}`}
                >
                  {movie.poster_path ? (
                    <Image
                      src={tmdbImageUrl(movie.poster_path)}
                      alt=""
                      width={62}
                      height={93}
                      className="h-[93px] w-[62px] shrink-0 object-cover"
                    />
                  ) : (
                    <div className="grid h-[93px] w-[62px] shrink-0 place-items-center bg-soft text-on-soft">
                      <Film aria-hidden="true" className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0 border-l-2 border-dashed border-ink/45 py-0.5 pl-4">
                    <p className="font-heading text-2xl leading-none tracking-wide uppercase">
                      {movie.title}
                      {/* A real space (not a margin), so the year can wrap. */}
                      {year && <> <span className="font-body text-sm tracking-normal text-ink-muted">({year})</span></>}
                    </p>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-ink-muted">{movie.overview}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}

// Header links: small typewriter capitals, underlined on hover. On phones
// they're 11px with 4px sides (and the title one size smaller), so all four
// fit beside the title at 375px.
const navItem = `inline-flex h-11 shrink-0 items-center px-1 text-[11px] font-medium tracking-wide uppercase underline-offset-4 hover:underline sm:px-2 sm:text-xs ${focusRingOnArt}`;

// The site's ticket icon (the same drawing as app/icon.svg) beside the name.
// From `sm` up only: on a 375px phone the name and the three links fill the row.
function TicketMark() {
  const ticket = "M2.5 6h27v6.5a3.5 3.5 0 0 0 0 7v6.5h-27v-6.5a3.5 3.5 0 0 0 0-7z";
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-9 shrink-0 max-sm:hidden">
      <defs>
        <clipPath id="ticket-mark">
          <path d={ticket} />
        </clipPath>
      </defs>
      <path d={ticket} className="fill-ticket" />
      <rect x="21.5" y="0" width="12" height="32" clipPath="url(#ticket-mark)" className="fill-primary" />
      <path d="M21.5 8v16" strokeWidth="1.5" strokeDasharray="2.2 1.6" className="stroke-ink" />
      <path d="M9.5 12.5h8M9.5 19.5h5" strokeWidth="2" className="stroke-ink" />
      <path d={ticket} fill="none" strokeWidth="2" strokeLinejoin="round" className="stroke-art-outline" />
    </svg>
  );
}

// You first, then everyone you share a list with, by name.
function toPeople(profiles: { user_id: string; display_name: string }[], userId: string | undefined): FormPerson[] {
  return profiles
    .map((p) => ({ id: p.user_id, name: p.display_name, isMe: p.user_id === userId }))
    .sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name));
}
