import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { Film, ListVideo, LogOut, Popcorn, Search, Settings, Sparkles } from "lucide-react";
import { signOut } from "@/app/login/actions";
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
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="flex shrink-0 items-center gap-2.5 text-3xl font-semibold tracking-tight">
          <span className="grid size-10 place-items-center rounded-full bg-primary text-on-primary">
            <Popcorn aria-hidden="true" className="size-5" />
          </span>
          Movie Night
        </h1>
        <nav aria-label="Main" className="flex min-w-0 items-center gap-1 text-sm font-semibold">
          {/* Who's signed in: your display name (Settings), or the email until
              there is one. Only where there's room. */}
          <span className="hidden truncate px-2 font-normal text-ink-muted md:block">
            {myName ?? auth?.claims.email}
          </span>
          {/* Phones get icons only (the three labels don't fit next to the
              title); the label stays for screen readers. */}
          <Link href="/lists" className={navItem}>
            <ListVideo aria-hidden="true" className="size-5" />
            <span className="sr-only sm:not-sr-only">Lists</span>
          </Link>
          <Link href="/settings" className={navItem}>
            <Settings aria-hidden="true" className="size-5" />
            <span className="sr-only sm:not-sr-only">Settings</span>
          </Link>
          <form action={signOut} className="shrink-0">
            <button type="submit" className={navItem}>
              <LogOut aria-hidden="true" className="size-5" />
              <span className="sr-only sm:not-sr-only">Sign&nbsp;out</span>
            </button>
          </form>
        </nav>
      </header>

      <section className="mb-10 rounded-card border-3 border-line bg-card p-5 shadow-soft sm:p-6">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">What are we watching tonight?</h2>
        <RecommendForm
          people={people}
          genres={genres.filter((g) => !HIDDEN_GENRES.has(g.id)).sort((a, b) => a.name.localeCompare(b.name))}
          initialWatchers={asked.length ? asked : people.map((p) => p.id)} // default: everyone
          initialGenres={askedGenres}
        />
        {/* Below the button, so "Recommend a movie" stays on a phone's first
            screen. Lilac + sparkles = your taste (the same as "Because you
            liked..." on /pick). */}
        {ratingCount < FEW_RATINGS ? (
          <p className="mt-5 flex items-start gap-2.5 rounded-field bg-lilac px-4 py-3 text-sm text-on-lilac">
            <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              <Link href="/rate" className="font-bold underline underline-offset-2">
                Rate a few movies you&rsquo;ve seen
              </Link>{" "}
              so recommendations learn your taste
              {ratingCount > 0 && ` (${ratingCount} so far)`}.
            </span>
          </p>
        ) : (
          <Link
            href="/rate"
            className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-on-soft underline-offset-4 hover:underline"
          >
            Rate more movies you&rsquo;ve seen
          </Link>
        )}
      </section>

      <h2 className="mb-3 text-lg font-semibold">Or look up a movie</h2>
      {/* action="" submits to this same page as /?q=... */}
      <Form action="" className="mb-8 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-muted"
          />
          <input
            key={query} // resets the box when navigating back/forward
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search for a movie…"
            aria-label="Search for a movie"
            autoComplete="off"
            enterKeyHint="search"
            className="h-11 w-full rounded-field border-2 border-line bg-card pr-3 pl-11 placeholder:text-ink-muted"
          />
        </div>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-full border-2 border-line bg-card px-5 font-semibold transition-colors duration-150 ease-out hover:bg-soft motion-safe:active:translate-y-px"
        >
          Search
        </button>
      </Form>

      {query && results.length === 0 && (
        <p className="text-ink-muted">No movies found for &ldquo;{query}&rdquo;. Try another spelling or fewer words.</p>
      )}

      <ul className="flex flex-col gap-3">
        {results.map((movie) => {
          const year = releaseYear(movie.release_date);
          return (
            <li key={movie.id}>
              <Link
                href={`/movie/${movie.id}`}
                className="flex gap-4 rounded-card border-2 border-line bg-card p-3 transition-colors duration-150 ease-out hover:border-primary"
              >
                {movie.poster_path ? (
                  <Image
                    src={tmdbImageUrl(movie.poster_path)}
                    alt=""
                    width={62}
                    height={93}
                    className="h-[93px] w-[62px] shrink-0 rounded-thumb object-cover"
                  />
                ) : (
                  <div className="grid h-[93px] w-[62px] shrink-0 place-items-center rounded-thumb bg-soft text-on-soft">
                    <Film aria-hidden="true" className="size-6" />
                  </div>
                )}
                <div className="min-w-0 py-0.5">
                  <p className="font-heading text-lg leading-snug font-medium">
                    {movie.title}
                    {/* A real space (not a margin), so the year can wrap. */}
                    {year && <> <span className="font-normal text-ink-muted">({year})</span></>}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{movie.overview}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

// Quiet header links (MASTER.md "Quiet" buttons): no fill until hovered.
const navItem =
  "inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-ink-muted transition-colors duration-150 ease-out hover:bg-soft hover:text-ink";

// You first, then everyone you share a list with, by name.
function toPeople(profiles: { user_id: string; display_name: string }[], userId: string | undefined): FormPerson[] {
  return profiles
    .map((p) => ({ id: p.user_id, name: p.display_name, isMe: p.user_id === userId }))
    .sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name));
}
