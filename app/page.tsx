import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
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
  // Coming back from /pick: keep what was chosen (/?watch=...&genre=...).
  const asked = ([] as string[]).concat(params.watch ?? []).filter((id) => people.some((p) => p.id === id));
  const askedGenres = ([] as string[]).concat(params.genre ?? []).map(Number);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="shrink-0 text-3xl font-semibold tracking-tight">Movie Night</h1>
        <div className="flex min-w-0 items-baseline gap-3 text-sm text-zinc-500">
          {/* No room on phones; the email is just a reminder of who is signed in. */}
          <span className="hidden truncate sm:block">{auth?.claims.email}</span>
          <Link href="/lists" className="shrink-0 hover:underline">
            Lists
          </Link>
          <Link href="/settings" className="shrink-0 hover:underline">
            Settings
          </Link>
          <form action={signOut} className="shrink-0">
            <button type="submit" className="whitespace-nowrap hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="mb-10 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-4 text-xl font-semibold">What are we watching tonight?</h2>
        {ratingCount < FEW_RATINGS && (
          <p className="mb-5 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <Link href="/rate" className="font-medium underline">
              Rate a few movies you&rsquo;ve seen
            </Link>{" "}
            so recommendations learn your taste
            {ratingCount > 0 && ` (${ratingCount} so far)`}.
          </p>
        )}
        <RecommendForm
          people={people}
          genres={genres.filter((g) => !HIDDEN_GENRES.has(g.id)).sort((a, b) => a.name.localeCompare(b.name))}
          initialWatchers={asked.length ? asked : people.map((p) => p.id)} // default: everyone
          initialGenres={askedGenres}
        />
        {ratingCount >= FEW_RATINGS && (
          <Link href="/rate" className="mt-4 inline-block text-sm text-zinc-500 hover:underline">
            Rate more movies you&rsquo;ve seen
          </Link>
        )}
      </section>

      <h2 className="mb-2 text-sm font-medium text-zinc-500">Or look up a movie</h2>
      {/* action="" submits to this same page as /?q=... */}
      <Form action="" className="mb-8 flex gap-2">
        <input
          key={query} // resets the box when navigating back/forward
          name="q"
          defaultValue={query}
          placeholder="Search for a movie…"
          aria-label="Search for a movie"
          className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          Search
        </button>
      </Form>

      {query && results.length === 0 && (
        <p className="text-zinc-500">No movies found for “{query}”.</p>
      )}

      <ul className="flex flex-col gap-3">
        {results.map((movie) => {
          const year = releaseYear(movie.release_date);
          return (
            <li key={movie.id}>
              <Link
                href={`/movie/${movie.id}`}
                className="flex gap-4 rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                {movie.poster_path ? (
                  <Image
                    src={tmdbImageUrl(movie.poster_path)}
                    alt=""
                    width={62}
                    height={93}
                    className="h-[93px] w-[62px] shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-[93px] w-[62px] shrink-0 rounded bg-zinc-200 dark:bg-zinc-800" />
                )}
                <div className="min-w-0">
                  <p className="font-medium">
                    {movie.title}
                    {year && <span className="ml-2 text-zinc-500">({year})</span>}
                  </p>
                  <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {movie.overview}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

// You first, then everyone you share a list with, by name.
function toPeople(profiles: { user_id: string; display_name: string }[], userId: string | undefined): FormPerson[] {
  return profiles
    .map((p) => ({ id: p.user_id, name: p.display_name, isMe: p.user_id === userId }))
    .sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name));
}
