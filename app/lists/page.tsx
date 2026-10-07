import Link from "next/link";
import { redirect } from "next/navigation";
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
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Search
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Your lists</h1>

      <CreateListForm />

      {data.length === 0 ? (
        <p className="mt-8 text-zinc-500">No lists yet. Make one above.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-2">
          {data.map((list) => {
            const count = list.list_items[0]?.count ?? 0;
            const others = list.list_members
              .filter((m) => m.user_id !== userId)
              .map((m) => names.get(m.user_id) ?? "someone");
            return (
              <li key={list.id}>
                <Link
                  href={`/lists/${list.id}`}
                  className="block rounded-lg border border-zinc-200 p-4 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <p className="font-medium">{list.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {count === 1 ? "1 movie" : `${count} movies`}
                    {" · "}
                    {others.length ? `with ${others.join(", ")}` : "just you"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
