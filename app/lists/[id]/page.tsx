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
  "rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:hover:bg-zinc-900 dark:hover:text-zinc-100";

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
  const memberIds = members.data.map((m) => m.user_id);
  const [names, seenBy] = await Promise.all([
    getDisplayNames(memberIds),
    getSeenBy(
      items.data.map((i) => i.movie_id),
      memberIds,
    ),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/lists" className="text-sm text-ink-muted hover:underline">
        ← Lists
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{name}</h1>

      {/* ---------------- Movies ---------------- */}
      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">
          Movies <span className="font-normal text-ink-muted">({items.data.length})</span>
        </h2>

        {items.data.length === 0 ? (
          <p className="text-ink-muted">
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
                      {details && <p className="text-sm text-ink-muted">{details}</p>}
                      <p className="text-sm text-ink-muted">
                        {describeSeenBy(seenBy.get(item.movie_id) ?? [], names, userId)}
                      </p>
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
                  {isMe && <span className="text-ink-muted"> (you)</span>}
                  {isListCreator && <span className="text-sm text-ink-muted"> · created the list</span>}
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
            <h3 className="mb-2 text-sm font-medium text-ink-muted">
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

type Verdict = "up" | "down";

// Which list members have rated (= seen) each movie. RLS already limits
// ratings to yours and your list-mates'; filtering by this list's members also
// leaves out people you only share a different list with.
async function getSeenBy(
  movieIds: number[],
  memberIds: string[],
): Promise<Map<number, { userId: string; verdict: Verdict }[]>> {
  const seenBy = new Map<number, { userId: string; verdict: Verdict }[]>();
  if (movieIds.length === 0) return seenBy;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ratings")
    .select("user_id, movie_id, verdict")
    .in("movie_id", movieIds)
    .in("user_id", memberIds);
  if (error) throw error;

  for (const r of data) {
    const list = seenBy.get(r.movie_id) ?? [];
    list.push({ userId: r.user_id, verdict: r.verdict as Verdict });
    seenBy.set(r.movie_id, list);
  }
  return seenBy;
}

// "Seen by you (liked it), Alex (not for me)", or "Not seen yet". You first.
function describeSeenBy(
  ratings: { userId: string; verdict: Verdict }[],
  names: Map<string, string>,
  userId: string,
): string {
  if (ratings.length === 0) return "Not seen yet";
  const parts = [...ratings]
    .sort((a, b) => Number(b.userId === userId) - Number(a.userId === userId))
    .map((r) => {
      const who = r.userId === userId ? "you" : (names.get(r.userId) ?? "someone");
      return `${who} (${r.verdict === "up" ? "liked it" : "not for me"})`;
    });
  return `Seen by ${parts.join(", ")}`;
}
