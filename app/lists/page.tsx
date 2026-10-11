import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { pagePanel, quietButton } from "@/app/ui";
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
    <main id="content" className={`${pagePanel} max-w-2xl`}>
      <Link href="/" className={`${quietButton} -ml-2`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Home
      </Link>

      <h1 className="mt-4 text-5xl">Your lists</h1>
      <p className="mt-2 text-sm text-ink-muted">Movies to watch together. Add one from any movie&rsquo;s page.</p>

      <div className="mt-6">
        <CreateListForm />
      </div>

      {data.length === 0 ? (
        <p className="mt-6 text-ink-muted">No lists yet. Make one above.</p>
      ) : (
        // Each list is a ticket stub: the count on the small part, torn off
        // along a dashed line, then the name. gap-4 leaves room for the
        // notches, which stick out 13px above and below each ticket.
        <ul className="mt-8 flex flex-col gap-4">
          {data.map((list) => {
            const count = list.list_items[0]?.count ?? 0;
            const others = list.list_members
              .filter((m) => m.user_id !== userId)
              .map((m) => names.get(m.user_id) ?? "someone");
            return (
              <li key={list.id}>
                <Link
                  href={`/lists/${list.id}`}
                  className="relative flex items-stretch border-2 border-transparent bg-ticket transition-colors duration-150 ease-out hover:border-ink"
                >
                  <span className="grid w-20 shrink-0 place-content-center border-r-2 border-dashed border-ink/45 py-3 text-center">
                    <span className="font-heading text-4xl leading-none">{count}</span>
                    <span className="mt-1 text-[10px] font-medium tracking-widest uppercase">
                      {count === 1 ? "movie" : "movies"}
                    </span>
                  </span>
                  <span aria-hidden="true" className={`${notch} -top-3.5`} />
                  <span aria-hidden="true" className={`${notch} -bottom-3.5`} />
                  <span className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 pl-4">
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

// A notch where the stub's dashed line meets the ticket's top or bottom edge
// (a circle in the page color), centered on the dashed line: the stub is 80px
// wide, its 2px line ends at 80px, so the circle starts at 80 - 1 - 13 = 66px.
const notch = "pointer-events-none absolute left-[calc(5rem-14px)] size-6.5 rounded-full bg-page";
