"use server";

import { refresh } from "next/cache";
import { ensureMovieCached } from "@/lib/movie-cache";
import { createClient } from "@/lib/supabase/server";

export type Verdict = "up" | "down";
export type RatingResult = { error: string | null };

// Set, change or remove (verdict = null) the signed-in user's rating.
// Server Actions are public endpoints: anyone can call this with any
// arguments, so validate everything here instead of trusting the UI.
export async function setRating(movieId: number, verdict: Verdict | null): Promise<RatingResult> {
  if (!Number.isSafeInteger(movieId) || movieId <= 0) {
    return { error: "That movie doesn't look right." };
  }
  if (verdict !== null && verdict !== "up" && verdict !== "down") {
    return { error: "That rating doesn't look right." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) {
    return { error: "Your session ended. Sign in again to rate movies." };
  }

  if (verdict === null) {
    // RLS limits this to the user's own rating.
    const { error } = await supabase
      .from("ratings")
      .delete()
      .eq("user_id", userId)
      .eq("movie_id", movieId);
    if (error) return { error: "Couldn't remove your rating. Try again." };
  } else {
    // ratings.movie_id must point at a cached movie.
    if (!(await ensureMovieCached(movieId))) {
      return { error: "That movie couldn't be found." };
    }
    // Saved with the user's own session, so RLS checks it's really theirs.
    const { error } = await supabase
      .from("ratings")
      .upsert(
        { user_id: userId, movie_id: movieId, verdict },
        { onConflict: "user_id,movie_id" },
      );
    if (error) return { error: "Couldn't save your rating. Try again." };
  }

  refresh(); // re-render the page with the saved rating
  return { error: null };
}
