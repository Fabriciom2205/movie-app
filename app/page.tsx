import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { posterUrl, releaseYear, searchMovies } from "@/lib/tmdb";

export default async function Home(props: PageProps<"/">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const results = query ? await searchMovies(query) : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Movie Night</h1>

      {/* action="" submits to this same page as /?q=... */}
      <Form action="" className="mb-8 flex gap-2">
        <input
          key={query} // resets the box when navigating back/forward
          name="q"
          defaultValue={query}
          placeholder="Search for a movie…"
          autoFocus
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
                    src={posterUrl(movie.poster_path)}
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
