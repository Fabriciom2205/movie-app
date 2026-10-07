"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// For forms that show a message. `value` echoes what was typed, so the input
// keeps it after an error (React clears form fields after every submit).
export type FormState = { error: string | null; message: string | null; value: string };

// Server Actions are public endpoints: anyone can call them with any
// arguments, so every one validates its input and session here. RLS decides
// who may change what; the page only hides buttons you can't use.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNED_OUT = "Your session ended. Sign in again.";

async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null, email: data?.claims.email ?? null };
}

// Same rule as the database's check: 1-100 characters after trimming.
function parseName(formData: FormData): string | null {
  const name = String(formData.get("name") ?? "").trim();
  return name.length >= 1 && name.length <= 100 ? name : null;
}

export async function createList(_prev: FormState, formData: FormData): Promise<FormState> {
  const typed = String(formData.get("name") ?? "");
  const name = parseName(formData);
  if (!name) return { error: "Give the list a name (up to 100 characters).", message: null, value: typed };

  const { supabase, userId } = await getSession();
  if (!userId) return { error: SIGNED_OUT, message: null, value: typed };

  // A trigger adds the creator as the list's first member.
  const { data, error } = await supabase.from("lists").insert({ name }).select("id").single();
  if (error) return { error: "Couldn't create the list. Try again.", message: null, value: typed };

  redirect(`/lists/${data.id}`);
}

export async function renameList(
  listId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const typed = String(formData.get("name") ?? "");
  const name = parseName(formData);
  if (!UUID.test(listId)) return { error: "That list doesn't look right.", message: null, value: typed };
  if (!name) return { error: "Names are 1 to 100 characters.", message: null, value: typed };

  const { supabase, userId } = await getSession();
  if (!userId) return { error: SIGNED_OUT, message: null, value: typed };

  // .select() returns the updated rows; RLS turns "not a member" into 0 rows.
  const { data, error } = await supabase.from("lists").update({ name }).eq("id", listId).select("id");
  if (error || data.length === 0) {
    return { error: "Couldn't rename the list. Try again.", message: null, value: typed };
  }

  refresh();
  return { error: null, message: "Renamed.", value: name };
}

export async function inviteToList(
  listId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!UUID.test(listId)) return { error: "That list doesn't look right.", message: null, value: email };
  if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.length > 254) {
    return { error: "Enter an email address.", message: null, value: email };
  }

  const { supabase, userId, email: myEmail } = await getSession();
  if (!userId) return { error: SIGNED_OUT, message: null, value: email };
  if (email.toLowerCase() === myEmail?.toLowerCase()) {
    return { error: "That's you. You're already on this list.", message: null, value: email };
  }

  // The database function checks that you created the list, then looks the
  // email up. Its error codes become messages here.
  const { error } = await supabase.rpc("invite_to_list", { _list_id: listId, _email: email });
  if (error?.code === "42501") {
    return { error: "Only the person who created this list can invite people.", message: null, value: email };
  }
  if (error?.code === "P0002") {
    return { error: "No account uses that email.", message: null, value: email };
  }
  if (error) return { error: "Couldn't send the invite. Try again.", message: null, value: email };

  refresh();
  return { error: null, message: `Added ${email}.`, value: "" };
}

// The actions below are used by plain buttons, with no message to show. If
// one fails it throws, and app/lists/error.tsx shows a "Try again" screen.

export async function deleteList(listId: string): Promise<void> {
  if (!UUID.test(listId)) throw new Error("That list doesn't look right.");
  const { supabase, userId } = await getSession();
  if (!userId) redirect("/login");

  // Only the creator passes RLS. Members and movies go with it (on delete cascade).
  const { data, error } = await supabase.from("lists").delete().eq("id", listId).select("id");
  if (error || data.length === 0) throw new Error("Couldn't delete the list.");

  redirect("/lists");
}

export async function leaveList(listId: string): Promise<void> {
  if (!UUID.test(listId)) throw new Error("That list doesn't look right.");
  const { supabase, userId } = await getSession();
  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", userId)
    .select("user_id");
  if (error || data.length === 0) throw new Error("Couldn't leave the list.");

  redirect("/lists");
}

export async function removeMember(listId: string, memberId: string): Promise<void> {
  if (!UUID.test(listId) || !UUID.test(memberId)) throw new Error("That member doesn't look right.");
  const { supabase, userId } = await getSession();
  if (!userId) redirect("/login");

  // RLS: only the list's creator can remove someone else.
  const { data, error } = await supabase
    .from("list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", memberId)
    .select("user_id");
  if (error || data.length === 0) throw new Error("Couldn't remove that person.");

  refresh();
}

export async function removeFromList(listId: string, movieId: number): Promise<void> {
  if (!UUID.test(listId) || !Number.isSafeInteger(movieId) || movieId <= 0) {
    throw new Error("That movie doesn't look right.");
  }
  const { supabase, userId } = await getSession();
  if (!userId) redirect("/login");

  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("list_id", listId)
    .eq("movie_id", movieId);
  if (error) throw new Error("Couldn't remove the movie.");

  refresh();
}
