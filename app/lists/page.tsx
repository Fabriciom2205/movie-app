import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, ListVideo } from "lucide-react";
import { quietButton } from "@/app/ui";
import { getDisplayNames } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { CreateListForm } from "./forms";

type ListRow = {
  id: string;
  name: string;
  list_items: { count: number }[]; // PostgREST returns embedded counts as [{ count }]
  list_members: { user_id: string }[];
};

export default async function ListsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect("/login");

  // RLS returns only the lists you're a member of.
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, list_items(count), list_members(user_id)")
    .order("created_at", { ascending: false })
    .overrideTypes<ListRow[], { merge: false }>();
  if (error) throw error;

  // Names of everyone you share a list with, in one query.
  const otherIds = [
    ...new Set(data.flatMap((l) => l.list_members.map((m) => m.user_id)).filter((id) => id !== userId)),
  ];
  const names = await getDisplayNames(otherIds);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <Link href="/" className={`${quietButton} -ml-3`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Home
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Your lists</h1>
      <p className="mt-1 text-ink-muted">
        Movies to watch together. Add one from any movie&rsquo;s page.
      </p>

      <div className="mt-6">
        <CreateListForm />
      </div>

      {data.length === 0 ? (
        <p className="mt-6 text-ink-muted">No lists yet. Make one above.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {data.map((list) => {
            const count = list.list_items[0]?.count ?? 0;
            const others = list.list_members
              .filter((m) => m.user_id !== userId)
              .map((m) => names.get(m.user_id) ?? "someone");
            return (
              <li key={list.id}>
                <Link
                  href={`/lists/${list.id}`}
                  className="flex items-center gap-3 rounded-card border-2 border-line bg-card p-3 pr-4 transition-colors duration-150 ease-out hover:border-primary"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-soft text-on-soft">
                    <ListVideo aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-lg font-medium">{list.name}</span>
                    <span className="block text-sm text-ink-muted">
                      {count === 1 ? "1 movie" : `${count} movies`}
                      {" · "}
                      {others.length ? `with ${others.join(", ")}` : "just you"}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
