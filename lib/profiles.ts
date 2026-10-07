import "server-only";
import { createClient } from "@/lib/supabase/server";

// Display names for these users, keyed by user id. RLS only returns your own
// profile and those of people you share a list with; anyone else is missing.
export async function getDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", userIds);
  if (error) throw error;
  return new Map(data.map((p) => [p.user_id, p.display_name]));
}
