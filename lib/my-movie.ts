import "server-only";
import type { Verdict } from "@/app/movie/[id]/actions";
import type { ListOption } from "@/app/movie/[id]/list-toggles";
import { createClient } from "@/lib/supabase/server";

// The signed-in user's own relationship to one movie, for the rating buttons
// and list pills (used on the movie page and the pick page).

// The signed-in user's own rating. Filter by user_id: list-mates' ratings are
// readable too, so "any rating for this movie" could be someone else's.
export async function getMyVerdict(movieId: number): Promise<Verdict | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("ratings")
    .select("verdict")
    .eq("user_id", userId)
    .eq("movie_id", movieId)
    .maybeSingle();
  return (data?.verdict as Verdict | undefined) ?? null;
}

// The user's lists (RLS returns only lists they're in), each marked with
// whether this movie is already on it.
export async function getMyLists(movieId: number): Promise<ListOption[]> {
  const supabase = await createClient();
  const [lists, items] = await Promise.all([
    supabase.from("lists").select("id, name").order("created_at"),
    supabase.from("list_items").select("list_id").eq("movie_id", movieId),
  ]);
  if (lists.error) throw lists.error;
  if (items.error) throw items.error;

  const withMovie = new Set(items.data.map((i) => i.list_id));
  return lists.data.map((l) => ({ id: l.id, name: l.name, hasMovie: withMovie.has(l.id) }));
}
