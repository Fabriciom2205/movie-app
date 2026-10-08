import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Film, LogOut, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { card, dangerButton, quietButton, secondaryButton } from "@/app/ui";
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
  const others = memberIds.filter((m) => m !== userId).map((m) => names.get(m) ?? "someone");

  return (
    <main id="content" className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <Link href="/lists" className={`${quietButton} -ml-3`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Your lists
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight break-words">{name}</h1>
      <p className="mt-1 text-ink-muted">
        {others.length ? `Shared with ${joinWords(others)}` : "Just you for now"}
      </p>

      {/* ---------------- Movies ---------------- */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight">
          Movies <span className="font-normal text-ink-muted">({items.data.length})</span>
        </h2>

        {items.data.length === 0 ? (
          <div className={`mt-3 ${card}`}>
            <div className="mb-3 grid size-11 place-items-center rounded-full bg-soft text-on-soft">
              <Film aria-hidden="true" className="size-5" />
            </div>
            <p className="font-semibold">No movies yet</p>
            <p className="mt-1 text-ink-muted">Look one up from home, then add it to this list from its page.</p>
            <Link href="/" className={`mt-4 ${secondaryButton}`}>
              Find a movie
            </Link>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {items.data.map((item) => {
              const movie = item.movies;
              if (!movie) return null; // can't happen: movie_id references movies
              const details = [releaseYear(movie.release_date ?? ""), formatRuntime(movie.runtime)]
                .filter(Boolean)
                .join(" · ");
              return (
                // The outline turns blue when the movie link is hovered (not Remove).
                <li
                  key={item.movie_id}
                  className="flex items-center gap-1 rounded-card border-2 border-line bg-card p-2 transition-colors duration-150 ease-out has-[a:hover]:border-primary"
                >
                  <Link
                    href={`/movie/${item.movie_id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-poster p-1"
                  >
                    {movie.poster_path ? (
                      <Image
                        src={tmdbImageUrl(movie.poster_path, "w92")}
                        alt=""
                        width={46}
                        height={69}
                        className="h-[69px] w-[46px] shrink-0 rounded-thumb object-cover"
                      />
                    ) : (
                      <div className="grid h-[69px] w-[46px] shrink-0 place-items-center rounded-thumb bg-soft text-on-soft">
                        <Film aria-hidden="true" className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-heading text-lg leading-snug font-medium">{movie.title}</p>
                      {details && <p className="text-sm text-ink-muted">{details}</p>}
                      <SeenBy ratings={seenBy.get(item.movie_id) ?? []} names={names} userId={userId} />
                    </div>
                  </Link>
                  <form action={removeFromList.bind(null, id, item.movie_id)} className="shrink-0">
                    <button
                      type="submit"
                      className={quietButton}
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
      <section className={`mt-8 ${card}`}>
        <h2 className="text-xl font-semibold tracking-tight">Who&rsquo;s on this list</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {members.data.map((m) => {
            const isMe = m.user_id === userId;
            const isListCreator = m.user_id === creatorId;
            const memberName = names.get(m.user_id) ?? "Someone";
            return (
              <li key={m.user_id} className="flex items-center gap-3">
                {/* Their initial in a circle, just decoration. */}
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-soft font-heading text-lg font-semibold text-on-soft"
                >
                  {memberName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {memberName}
                    {isMe && <span className="font-normal text-ink-muted"> (you)</span>}
                  </span>
                  {isListCreator && <span className="block text-sm text-ink-muted">Created the list</span>}
                </span>
                {isCreator && !isMe && (
                  <ConfirmButton
                    action={removeMember.bind(null, id, m.user_id)}
                    question={`Remove ${memberName} from "${name}"?`}
                    className={quietButton}
                  >
                    Remove
                  </ConfirmButton>
                )}
              </li>
            );
          })}
        </ul>

        {isCreator && (
          <div className="mt-5 border-t-2 border-line pt-5">
            <InviteForm listId={id} />
          </div>
        )}
      </section>

      {/* ---------------- Settings ---------------- */}
      <section className={`mt-6 ${card}`}>
        <h2 className="text-xl font-semibold tracking-tight">List settings</h2>
        <div className="mt-4">
          <RenameListForm listId={id} name={name} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-line pt-5">
          {isCreator ? (
            <>
              <ConfirmButton
                action={deleteList.bind(null, id)}
                question={`Delete "${name}" for everyone on it? This can't be undone.`}
                className={dangerButton}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Delete list
              </ConfirmButton>
              <p className="text-sm text-ink-muted">Removes it for everyone on it.</p>
            </>
          ) : (
            <>
              <ConfirmButton
                action={leaveList.bind(null, id)}
                question={`Leave "${name}"? You'll need to be added again to see it.`}
                className={secondaryButton}
              >
                <LogOut aria-hidden="true" className="size-4" />
                Leave list
              </ConfirmButton>
              <p className="text-sm text-ink-muted">You&rsquo;d need to be added again to see it.</p>
            </>
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

// Who on this list has seen the movie, as small tags (you first): "You liked
// it" in mint, "Alex wasn't into it" in peach (the /pick colors), or "Not seen
// yet". The point of a shared list: spot what a friend has already seen.
function SeenBy({
  ratings,
  names,
  userId,
}: {
  ratings: { userId: string; verdict: Verdict }[];
  names: Map<string, string>;
  userId: string;
}) {
  if (ratings.length === 0) return <p className="mt-1 text-sm text-ink-muted">Not seen yet</p>;
  const sorted = [...ratings].sort((a, b) => Number(b.userId === userId) - Number(a.userId === userId));
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {sorted.map((r) => {
        const isMe = r.userId === userId;
        const who = isMe ? "You" : (names.get(r.userId) ?? "Someone");
        const liked = r.verdict === "up";
        const Icon = liked ? ThumbsUp : ThumbsDown;
        return (
          <li
            key={r.userId}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              liked ? "bg-mint text-on-mint" : "bg-peach text-on-peach"
            }`}
          >
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            {liked ? `${who} liked it` : `${who} ${isMe ? "weren’t" : "wasn’t"} into it`}
          </li>
        );
      })}
    </ul>
  );
}

// ["a"] -> "a", ["a", "b"] -> "a and b", ["a", "b", "c"] -> "a, b and c"
function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}
