import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { Film } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { TicketDate } from "@/app/ticket-date";
import { SideNotches } from "@/app/ticket";
import { field, fieldSecondaryButton, pagePanel, quietButton, sectionLabel } from "@/app/ui";
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

  return (
    <main className={`${pagePanel} max-w-2xl`}>
      <header className="mb-6 flex items-center justify-between gap-2">
        <h1 className="shrink-0 text-4xl">Movie Night</h1>
        <nav aria-label="Main" className="flex min-w-0 items-center">
          {/* Who's signed in: your display name (Settings), or the email until
              there is one. Only where there's room. */}
          <span className="hidden truncate px-2 text-xs text-ink-muted md:block">{myName ?? auth?.claims.email}</span>
          <Link href="/lists" className={navItem}>
            Lists
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

      {/* The picker is the page's ticket: what it's for at the top, the
          choices, then the tear line and the stub (in RecommendForm). */}
      <section id="content" aria-labelledby="picker-title" className="mb-6 bg-ticket shadow-soft">
        <div className="px-5 pt-4 sm:px-6 sm:pt-5">
          <p className={`${sectionLabel} flex justify-between gap-4`}>
            <span>Tonight&rsquo;s showing</span>
            <TicketDate />
          </p>
          <h2 id="picker-title" className="mt-2 mb-4 text-4xl sm:mt-2.5 sm:mb-5 sm:text-6xl">
            What are we watching tonight?
          </h2>
        </div>
        <RecommendForm
          people={people}
          genres={genres.filter((g) => !HIDDEN_GENRES.has(g.id)).sort((a, b) => a.name.localeCompare(b.name))}
          initialWatchers={asked.length ? asked : people.map((p) => p.id)} // default: everyone
          initialGenres={askedGenres}
        />
      </section>

      {/* Below the ticket, so "Recommend a movie" stays on a phone's first
          screen. A small pink side ticket while your taste is still unknown;
          after that, just a link. */}
      {ratingCount < FEW_RATINGS ? (
        <p className="relative mb-10 bg-ticket-pink px-6 py-3.5 text-[13px] leading-relaxed">
          <SideNotches />
          <Link href="/rate" className="font-medium underline underline-offset-3">
            Rate a few movies you&rsquo;ve seen
          </Link>{" "}
          so recommendations learn your taste
          {ratingCount > 0 && ` (${ratingCount} so far)`}.
        </p>
      ) : (
        <Link href="/rate" className={`${quietButton} -ml-2 mb-8`}>
          Rate more movies you&rsquo;ve seen
        </Link>
      )}

      {/* action="" submits to this same page as /?q=... */}
      <Form action="" className="mb-8">
        <label htmlFor="search" className={`${sectionLabel} mb-1.5 block`}>
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
            className={field}
          />
          <button type="submit" className={fieldSecondaryButton}>
            Find
          </button>
        </div>
      </Form>

      {query && results.length === 0 && (
        <p className="text-ink-muted">No movies found for &ldquo;{query}&rdquo;. Try another spelling or fewer words.</p>
      )}

      {/* Each result is a small ticket: poster, then a dashed tear line,
          then the title. */}
      <ul className="flex flex-col gap-3">
        {results.map((movie) => {
          const year = releaseYear(movie.release_date);
          return (
            <li key={movie.id}>
              <Link
                href={`/movie/${movie.id}`}
                className="flex gap-4 border-2 border-transparent bg-ticket p-3 transition-colors duration-150 ease-out hover:border-ink"
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
  );
}

// Header links: small typewriter capitals, underlined on hover. 11px on
// phones, so all three fit beside the title at 375px.
const navItem =
  "inline-flex h-11 shrink-0 items-center px-1.5 text-[11px] font-medium tracking-wide uppercase underline-offset-4 hover:underline sm:px-2 sm:text-xs";

// You first, then everyone you share a list with, by name.
function toPeople(profiles: { user_id: string; display_name: string }[], userId: string | undefined): FormPerson[] {
  return profiles
    .map((p) => ({ id: p.user_id, name: p.display_name, isMe: p.user_id === userId }))
    .sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name));
}
