import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { focusRingOnArt, quietButtonOnArt, textOnArt, wallColumn } from "@/app/ui";
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

  // The title and the create form sit on the room art, and each list is a
  // ticket stub on the wall (MASTER.md "Lists").
  return (
    <main id="content" className={`${wallColumn} max-w-2xl`}>
      <Link href="/" className={`${quietButtonOnArt} -ml-2`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Home
      </Link>

      <h1 className={`mt-4 text-5xl ${textOnArt}`}>Your lists</h1>
      <p className={`mt-2 text-sm ${textOnArt}`}>Movies to watch together. Add one from any movie&rsquo;s page.</p>

      <div className="mt-6">
        <CreateListForm />
      </div>

      {data.length === 0 ? (
        <p className={`mt-6 ${textOnArt}`}>No lists yet. Make one above.</p>
      ) : (
        // Each list is a ticket stub: the count on the small part, torn off
        // along a dashed line, then the name. gap-6 keeps the notches of two
        // tickets in a row from running into each other.
        <ul className="mt-8 flex flex-col gap-6">
          {data.map((list) => {
            const count = list.list_items[0]?.count ?? 0;
            const others = list.list_members
              .filter((m) => m.user_id !== userId)
              .map((m) => names.get(m.user_id) ?? "someone");
            return (
              <li key={list.id} className="on-the-wall">
                <Link href={`/lists/${list.id}`} className={`group relative flex items-stretch ${focusRingOnArt}`}>
                  {/* The paper, behind the print, with a notch cut where the
                      dashed line meets each edge. Cut out of this layer and
                      not the link, so the link's focus ring isn't cut too.
                      Hover lightens the stock, as on the home search results. */}
                  <span
                    aria-hidden="true"
                    className="stub-notches-cut absolute inset-0 bg-ticket transition-colors duration-150 ease-out group-hover:bg-soft"
                  >
                    <span className="absolute inset-y-0 left-[calc(5rem-2px)] border-l-2 border-dashed border-ink/45" />
                  </span>
                  <span className="relative grid w-20 shrink-0 place-content-center py-3 text-center">
                    <span className="font-heading text-4xl leading-none">{count}</span>
                    <span className="mt-1 text-[10px] font-medium tracking-widest uppercase">
                      {count === 1 ? "movie" : "movies"}
                    </span>
                  </span>
                  <span className="relative flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 pl-4">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-heading text-3xl leading-none tracking-wide uppercase">
                        {list.name}
                      </span>
                      <span className="mt-1.5 block truncate text-xs font-medium tracking-wide text-ink-muted uppercase">
                        {others.length ? `With ${others.join(", ")}` : "Just you"}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
