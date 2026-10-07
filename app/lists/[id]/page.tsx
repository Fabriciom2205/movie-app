import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDisplayNames } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { formatRuntime, releaseYear, tmdbImageUrl } from "@/lib/tmdb";
import { deleteList, leaveList, removeFromList, removeMember } from "../actions";
import { ConfirmButton, InviteForm, RenameListForm } from "../forms";

type ItemRow = {
  movie_id: number;
  added_at: string;
  movies: {
    title: string;
    release_date: string | null;
    poster_path: string | null;
    runtime: number | null;
  } | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const smallButton =
  "rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:hover:bg-zinc-900 dark:hover:text-zinc-100";

export default async function ListPage(props: PageProps<"/lists/[id]">) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect("/login");

  const [list, items, members] = await Promise.all([
    supabase.from("lists").select("id, name, created_by").eq("id", id).maybeSingle(),
    supabase
      .from("list_items")
      .select("movie_id, added_at, movies(title, release_date, poster_path, runtime)")
      .eq("list_id", id)
      .order("added_at", { ascending: false })
      .overrideTypes<ItemRow[], { merge: false }>(),
    supabase.from("list_members").select("user_id, added_at").eq("list_id", id).order("added_at"),
  ]);
  if (list.error) throw list.error;
  if (items.error) throw items.error;
  if (members.error) throw members.error;
  // Not a member looks the same as "doesn't exist": RLS returns no row.
  if (!list.data) notFound();

  const { name, created_by: creatorId } = list.data;
  const isCreator = creatorId === userId;
  const names = await getDisplayNames(members.data.map((m) => m.user_id));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/lists" className="text-sm text-zinc-500 hover:underline">
        ← Lists
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{name}</h1>

      {/* ---------------- Movies ---------------- */}
      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">
          Movies <span className="font-normal text-zinc-500">({items.data.length})</span>
        </h2>

        {items.data.length === 0 ? (
          <p className="text-zinc-500">
            No movies yet.{" "}
            <Link href="/" className="underline">
              Search for one
            </Link>{" "}
            and add it from its page.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.data.map((item) => {
              const movie = item.movies;
              if (!movie) return null; // can't happen: movie_id references movies
              const details = [releaseYear(movie.release_date ?? ""), formatRuntime(movie.runtime)]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={item.movie_id} className="flex items-center gap-3">
                  <Link
                    href={`/movie/${item.movie_id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    {movie.poster_path ? (
                      <Image
                        src={tmdbImageUrl(movie.poster_path, "w92")}
                        alt=""
                        width={46}
                        height={69}
                        className="h-[69px] w-[46px] shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-[69px] w-[46px] shrink-0 rounded bg-zinc-200 dark:bg-zinc-800" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{movie.title}</p>
                      {details && <p className="text-sm text-zinc-500">{details}</p>}
                    </div>
                  </Link>
                  <form action={removeFromList.bind(null, id, item.movie_id)}>
                    <button
                      type="submit"
                      className={smallButton}
                      aria-label={`Remove ${movie.title} from this list`}
                    >
                      Remove
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------------- Members ---------------- */}
      <section className="mt-10">
        <h2 className="mb-3 text-xl font-semibold">Who&rsquo;s on this list</h2>
        <ul className="flex flex-col gap-1">
          {members.data.map((m) => {
            const isMe = m.user_id === userId;
            const isListCreator = m.user_id === creatorId;
            return (
              <li key={m.user_id} className="flex items-center justify-between gap-3">
                <span>
                  {names.get(m.user_id) ?? "Someone"}
                  {isMe && <span className="text-zinc-500"> (you)</span>}
                  {isListCreator && <span className="text-sm text-zinc-500"> · created the list</span>}
                </span>
                {isCreator && !isMe && (
                  <ConfirmButton
                    action={removeMember.bind(null, id, m.user_id)}
                    question={`Remove ${names.get(m.user_id) ?? "this person"} from "${name}"?`}
                    className={smallButton}
                  >
                    Remove
                  </ConfirmButton>
                )}
              </li>
            );
          })}
        </ul>

        {isCreator && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-500">
              Add someone by the email they sign in with
            </h3>
            <InviteForm listId={id} />
          </div>
        )}
      </section>

      {/* ---------------- Settings ---------------- */}
      <section className="mt-10">
        <h2 className="mb-3 text-xl font-semibold">List settings</h2>
        <RenameListForm listId={id} name={name} />
        <div className="mt-4">
          {isCreator ? (
            <ConfirmButton
              action={deleteList.bind(null, id)}
              question={`Delete "${name}" for everyone on it? This can't be undone.`}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Delete list
            </ConfirmButton>
          ) : (
            <ConfirmButton
              action={leaveList.bind(null, id)}
              question={`Leave "${name}"? You'll need to be added again to see it.`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Leave list
            </ConfirmButton>
          )}
        </div>
      </section>
    </main>
  );
}
