import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { getDisplayNames } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { releaseYear, searchMovies, tmdbImageUrl } from "@/lib/tmdb";
import { PickerForm, type PickerList } from "./picker-form";

type ListRow = { id: string; name: string; list_members: { user_id: string }[] };

export default async function Home(props: PageProps<"/">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const supabase = await createClient();
  const [{ data: auth }, results, lists] = await Promise.all([
    supabase.auth.getClaims(),
    query ? searchMovies(query) : Promise.resolve([]),
    // Newest first, so the picker defaults to the list you made last.
    supabase
      .from("lists")
      .select("id, name, list_members(user_id)")
      .order("created_at", { ascending: false })
      .overrideTypes<ListRow[], { merge: false }>(),
  ]);
  if (lists.error) throw lists.error;
  const pickerLists = await toPickerLists(lists.data, auth?.claims.sub);

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
        <PickerForm lists={pickerLists} />
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

// Lists with their members' names, you first, for the picker form.
async function toPickerLists(lists: ListRow[], userId: string | undefined): Promise<PickerList[]> {
  const names = await getDisplayNames([...new Set(lists.flatMap((l) => l.list_members.map((m) => m.user_id)))]);
  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    members: l.list_members
      .map((m) => ({ id: m.user_id, name: names.get(m.user_id) ?? "Someone", isMe: m.user_id === userId }))
      .sort((a, b) => Number(b.isMe) - Number(a.isMe)),
  }));
}
